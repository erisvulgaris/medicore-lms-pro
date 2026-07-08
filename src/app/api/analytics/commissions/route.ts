import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

// Doctor commission & referral analytics.
// Commission = sum over referred orders of (payableAmount * commissionRate / 100), only for
// orders that have been paid (at least partially). Includes a compliance note: commission
// tracking is configurable and OFF by default; enable only where legally permitted.
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("doctors.read")
    const orgId = user.organizationId
    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "90"
    const days = Math.min(Math.max(parseInt(range), 7), 365)
    const start = new Date(Date.now() - days * 86400000)

    const doctors = await db.doctor.findMany({
      where: { organizationId: orgId, active: true },
      orderBy: { name: "asc" },
    })

    // all referred orders in range
    const orders = await db.testOrder.findMany({
      where: { organizationId: orgId, doctorId: { not: null }, createdAt: { gte: start } },
      include: {
        doctor: { select: { id: true, name: true, commissionRate: true, commissionEnabled: true } },
        invoice: { select: { paidAmount: true, totalAmount: true, status: true } },
      },
    })

    // group by doctor
    const byDoctor: Record<string, {
      doctorId: string
      name: string
      specialization: string
      commissionRate: number
      commissionEnabled: boolean
      referralCount: number
      totalBilled: number
      totalCollected: number
      pendingCollection: number
      commissionEarned: number
      commissionPaid: number
      testsReferred: number
    }> = {}

    for (const d of doctors) {
      byDoctor[d.id] = {
        doctorId: d.id,
        name: d.name,
        specialization: d.specialization || "—",
        commissionRate: d.commissionRate,
        commissionEnabled: d.commissionEnabled,
        referralCount: 0,
        totalBilled: 0,
        totalCollected: 0,
        pendingCollection: 0,
        commissionEarned: 0,
        commissionPaid: 0,
        testsReferred: 0,
      }
    }

    for (const o of orders) {
      if (!o.doctor) continue
      const entry = byDoctor[o.doctor.id]
      if (!entry) continue
      entry.referralCount++
      entry.totalBilled += o.payableAmount
      const collected = o.invoice?.paidAmount ?? 0
      entry.totalCollected += collected
      entry.pendingCollection += Math.max(0, o.payableAmount - collected)
      if (o.doctor.commissionEnabled && o.doctor.commissionRate > 0) {
        // commission on collected amount
        entry.commissionEarned += Math.round((collected * o.doctor.commissionRate) / 100)
      }
      entry.testsReferred += o.orderTests?.length ?? 0
    }

    const list = Object.values(byDoctor)
      .filter((d) => d.referralCount > 0 || d.commissionEnabled)
      .sort((a, b) => b.referralCount - a.referralCount)

    const totals = {
      doctors: list.length,
      referralCount: list.reduce((s, d) => s + d.referralCount, 0),
      totalBilled: list.reduce((s, d) => s + d.totalBilled, 0),
      totalCollected: list.reduce((s, d) => s + d.totalCollected, 0),
      pendingCollection: list.reduce((s, d) => s + d.pendingCollection, 0),
      commissionEarned: list.reduce((s, d) => s + d.commissionEarned, 0),
      commissionPaid: list.reduce((s, d) => s + d.commissionPaid, 0),
      commissionDue: 0,
    }
    totals.commissionDue = totals.commissionEarned - totals.commissionPaid

    // top referrers (by count)
    const topReferrers = [...list].sort((a, b) => b.totalBilled - a.totalBilled).slice(0, 5)

    return Response.json({
      range: { days, start: start.toISOString() },
      doctors: list,
      totals,
      topReferrers,
      complianceNote: "Commission tracking is configurable and OFF by default. Enable only where legally permitted and documented in your agreement with each referring doctor. This system records referrals and computes commission on collected amounts; it does not process payouts.",
    })
  } catch (e) {
    return errorResponse(e)
  }
}
