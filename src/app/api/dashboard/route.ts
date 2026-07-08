import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"
import { hasPermission } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const orgId = user.organizationId

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [
      totalPatients,
      totalOrders,
      totalInvoices,
      pendingSamples,
      criticalResults,
      approvedReports,
      pendingReports,
      revenueThisMonth,
      revenuePrevMonth,
      patientsThisMonth,
      patientsPrevMonth,
      ordersThisMonth,
      homeCollections,
      outstandingAmount,
      lowStockItems,
      recentOrders,
      recentAudit,
      notifications,
    ] = await Promise.all([
      db.patient.count({ where: { organizationId: orgId } }),
      db.testOrder.count({ where: { organizationId: orgId } }),
      db.invoice.count({ where: { organizationId: orgId } }),
      db.sample.count({ where: { organizationId: orgId, status: { in: ["COLLECTED", "RECEIVED", "PROCESSING"] } } }),
      db.result.count({ where: { flag: { in: ["CRITICAL_LOW", "CRITICAL_HIGH"] } } }),
      db.report.count({ where: { organizationId: orgId, status: "APPROVED" } }),
      db.testOrder.count({ where: { organizationId: orgId, status: { in: ["REGISTERED", "COLLECTED", "PROCESSING", "COMPLETED", "VERIFIED"] } } }),
      db.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      db.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } }, _sum: { amount: true } }),
      db.patient.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
      db.patient.count({ where: { organizationId: orgId, createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
      db.testOrder.count({ where: { organizationId: orgId, createdAt: { gte: startOfMonth } } }),
      db.testOrder.count({ where: { organizationId: orgId, isHomeCollection: true } }),
      db.invoice.aggregate({ where: { organizationId: orgId, status: { in: ["UNPAID", "PARTIAL"] } }, _sum: { balanceDue: true } }),
      (async () => {
        const items = await db.inventoryItem.findMany({ where: { organizationId: orgId }, select: { stockQty: true, reorderLevel: true } })
        return items.filter((i) => i.stockQty <= i.reorderLevel).length
      })(),
      db.testOrder.findMany({
        where: { organizationId: orgId },
        include: { patient: { select: { firstName: true, lastName: true, patientCode: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.auditLog.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.notification.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 8 }),
    ])

    // Revenue + orders trend (last 14 days)
    const days: { date: string; revenue: number; orders: number; patients: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59)
      const [rev, ords, pats] = await Promise.all([
        db.payment.aggregate({ where: { organizationId: orgId, paidAt: { gte: dayStart, lte: dayEnd } }, _sum: { amount: true } }),
        db.testOrder.count({ where: { organizationId: orgId, createdAt: { gte: dayStart, lte: dayEnd } } }),
        db.patient.count({ where: { organizationId: orgId, createdAt: { gte: dayStart, lte: dayEnd } } }),
      ])
      days.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: rev._sum.amount ?? 0,
        orders: ords,
        patients: pats,
      })
    }

    // Order status distribution
    const statusCounts = await db.testOrder.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    })

    // Top tests
    const topTestsRaw = await db.orderTest.groupBy({
      by: ["testId"],
      where: { order: { organizationId: orgId } },
      _count: true,
      orderBy: { _count: { testId: "desc" } },
      take: 6,
    })
    const testIds = topTestsRaw.map((t) => t.testId)
    const tests = await db.test.findMany({ where: { id: { in: testIds } }, select: { id: true, name: true, shortName: true } })
    const topTests = topTestsRaw.map((t) => ({
      name: tests.find((x) => x.id === t.testId)?.shortName ?? tests.find((x) => x.id === t.testId)?.name ?? "—",
      count: t._count,
    }))

    // Department distribution
    const deptRaw = await db.orderTest.groupBy({
      by: ["testId"],
      where: { order: { organizationId: orgId } },
      _count: true,
    })

    const revThis = revenueThisMonth._sum.amount ?? 0
    const revPrev = revenuePrevMonth._sum.amount ?? 0
    const revenueChange = revPrev > 0 ? ((revThis - revPrev) / revPrev) * 100 : revThis > 0 ? 100 : 0

    // ── TAT compliance widget (last 30 days, completed+ orders) ──
    const tatOrders = await db.testOrder.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["COMPLETED", "VERIFIED", "APPROVED", "DELIVERED"] },
        createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      include: {
        orderTests: { include: { test: { select: { tatHours: true } } } },
        report: { select: { approvedAt: true } },
      },
      take: 300,
    })
    let tatMeasured = 0
    let tatCompliant = 0
    for (const o of tatOrders) {
      if (!o.report?.approvedAt) continue
      const expected = Math.max(...o.orderTests.map((ot) => ot.test.tatHours || 24), 24)
      const actual = (o.report.approvedAt.getTime() - o.createdAt.getTime()) / 3600000
      tatMeasured++
      if (actual <= expected) tatCompliant++
    }
    const tatCompliance = tatMeasured ? Math.round((tatCompliant / tatMeasured) * 100) : 0

    // ── Overdue active samples (age > expected TAT) ──
    const activeSamples = await db.sample.findMany({
      where: { organizationId: orgId, status: { in: ["COLLECTED", "RECEIVED", "PROCESSING"] } },
      include: { order: { include: { orderTests: { include: { test: { select: { tatHours: true } } } } } } },
      take: 200,
    })
    const agingNow = new Date()
    let overdueSamples = 0
    const agingBuckets = { fresh: 0, aging: 0, stale: 0, critical: 0 }
    for (const s of activeSamples) {
      const ageHours = (agingNow.getTime() - s.collectedAt.getTime()) / 3600000
      const expected = Math.max(...s.order.orderTests.map((ot) => ot.test.tatHours || 24), 24)
      if (ageHours > expected) overdueSamples++
      if (ageHours < 4) agingBuckets.fresh++
      else if (ageHours < 8) agingBuckets.aging++
      else if (ageHours < 24) agingBuckets.stale++
      else agingBuckets.critical++
    }

    return Response.json({
      canViewFinance: hasPermission(user.role, "finance.view"),
      stats: {
        revenue: revThis,
        revenueChange,
        totalPatients,
        patientsThisMonth,
        patientsChange: patientsPrevMonth > 0 ? ((patientsThisMonth - patientsPrevMonth) / patientsPrevMonth) * 100 : 0,
        totalOrders,
        ordersThisMonth,
        pendingSamples,
        pendingReports,
        criticalResults,
        approvedReports,
        homeCollections,
        outstanding: outstandingAmount._sum.balanceDue ?? 0,
        lowStockItems,
        totalInvoices,
        tatCompliance,
        tatMeasured,
        tatCompliant,
        overdueSamples,
      },
      sampleAging: { total: activeSamples.length, buckets: agingBuckets },
      trend: days,
      statusDistribution: statusCounts.map((s) => ({ status: s.status, count: s._count })),
      topTests,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        code: o.orderCode,
        status: o.status,
        priority: o.priority,
        patient: `${o.patient.firstName} ${o.patient.lastName}`,
        patientCode: o.patient.patientCode,
        amount: o.payableAmount,
        createdAt: o.createdAt,
      })),
      recentActivity: recentAudit.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        user: a.user?.name ?? "System",
        createdAt: a.createdAt,
        details: a.details,
      })),
      notifications,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
