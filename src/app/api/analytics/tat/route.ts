import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

// TAT compliance + sample aging analytics.
// TAT = turnaround time. For completed/approved orders, measure actual hours from
// order creation to report approval vs the configured per-test TAT (max of test TATs).
// Sample aging = how long pending/in-progress samples have been waiting.
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("dashboard.view")
    const orgId = user.organizationId

    const now = new Date()

    // ── TAT compliance (orders that have a report or are completed+) ──
    const completedOrders = await db.testOrder.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "VERIFIED", "APPROVED", "DELIVERED"] },
      },
      include: {
        orderTests: { include: { test: { select: { tatHours: true, shortName: true, name: true } } } },
        report: { select: { approvedAt: true } },
      },
      take: 500,
      orderBy: { createdAt: "desc" },
    })

    let tatTotal = 0
    let tatCompliant = 0
    let tatBreached = 0
    let tatPending = 0 // completed but no report approved yet → pending TAT measurement
    const tatBuckets = { onTime: 0, slight: 0, overdue: 0 } // <=100%, 100-150%, >150%
    const perTestTat: Record<string, { name: string; total: number; compliant: number; avgActual: number }> = {}

    for (const o of completedOrders) {
      const expectedTat = Math.max(...o.orderTests.map((ot) => ot.test.tatHours || 24), 24)
      const endTime = o.report?.approvedAt
      if (!endTime) {
        tatPending++
        continue
      }
      const actualHours = (endTime.getTime() - o.createdAt.getTime()) / 3600000
      const ratio = actualHours / expectedTat
      tatTotal++
      if (actualHours <= expectedTat) {
        tatCompliant++
        tatBuckets.onTime++
      } else if (ratio <= 1.5) {
        tatBuckets.slight++
        tatBreached++
      } else {
        tatBuckets.overdue++
        tatBreached++
      }
      // per-test aggregation (use the longest-TAT test in the order as the representative)
      const repTest = o.orderTests.map((ot) => ot.test).sort((a, b) => b.tatHours - a.tatHours)[0]
      if (repTest) {
        const key = repTest.shortName || repTest.name
        if (!perTestTat[key]) perTestTat[key] = { name: key, total: 0, compliant: 0, avgActual: 0 }
        perTestTat[key].total++
        perTestTat[key].avgActual += actualHours
        if (actualHours <= expectedTat) perTestTat[key].compliant++
      }
    }

    const perTestList = Object.values(perTestTat)
      .map((t) => ({ ...t, avgActual: t.total ? +(t.avgActual / t.total).toFixed(1) : 0, compliance: t.total ? Math.round((t.compliant / t.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)

    // ── Sample aging (samples not yet completed/rejected) ──
    const activeSamples = await db.sample.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["COLLECTED", "RECEIVED", "PROCESSING"] },
      },
      include: {
        order: {
          include: {
            patient: { select: { firstName: true, lastName: true, patientCode: true } },
            orderTests: { include: { test: { select: { shortName: true, name: true, tatHours: true } } } },
          },
        },
      },
      take: 200,
      orderBy: { collectedAt: "asc" },
    })

    const agingBuckets = { fresh: 0, aging: 0, stale: 0, critical: 0 } // <4h, 4-8h, 8-24h, >24h
    const sampleList = activeSamples.map((s) => {
      const ageHours = (now.getTime() - s.collectedAt.getTime()) / 3600000
      const expectedTat = Math.max(...s.order.orderTests.map((ot) => ot.test.tatHours || 24), 24)
      const overdue = ageHours > expectedTat
      const remainingHours = Math.max(0, expectedTat - ageHours)
      if (ageHours < 4) agingBuckets.fresh++
      else if (ageHours < 8) agingBuckets.aging++
      else if (ageHours < 24) agingBuckets.stale++
      else agingBuckets.critical++
      return {
        id: s.id,
        barcode: s.barcode,
        sampleCode: s.sampleCode,
        status: s.status,
        collectedAt: s.collectedAt,
        ageHours: +ageHours.toFixed(1),
        expectedTat,
        remainingHours: +remainingHours.toFixed(1),
        overdue,
        patient: `${s.order.patient.firstName} ${s.order.patient.lastName}`,
        patientCode: s.order.patient.patientCode,
        orderCode: s.order.orderCode,
        tests: s.order.orderTests.map((ot) => ot.test.shortName || ot.test.name).join(", "),
      }
    }).sort((a, b) => b.ageHours - a.ageHours)

    // ── TAT trend (last 14 days, compliance %) ──
    const days: { date: string; compliance: number; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59)
      const dayOrders = completedOrders.filter((o) => o.report?.approvedAt && o.report.approvedAt >= dayStart && o.report.approvedAt <= dayEnd)
      const compliant = dayOrders.filter((o) => {
        const expected = Math.max(...o.orderTests.map((ot) => ot.test.tatHours || 24), 24)
        return (o.report!.approvedAt!.getTime() - o.createdAt.getTime()) / 3600000 <= expected
      }).length
      days.push({
        date: dayStart.toISOString().slice(0, 10),
        compliance: dayOrders.length ? Math.round((compliant / dayOrders.length) * 100) : 0,
        count: dayOrders.length,
      })
    }

    const complianceRate = tatTotal ? Math.round((tatCompliant / tatTotal) * 100) : 0

    return Response.json({
      tat: {
        complianceRate,
        total: tatTotal,
        compliant: tatCompliant,
        breached: tatBreached,
        pending: tatPending,
        buckets: tatBuckets,
        perTest: perTestList,
        trend: days,
      },
      sampleAging: {
        total: activeSamples.length,
        buckets: agingBuckets,
        samples: sampleList,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
