import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

// Finance analytics: daily collection summary, GST report, outstanding aging, P&L.
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("finance.view")
    const orgId = user.organizationId
    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "30" // days
    const days = Math.min(Math.max(parseInt(range), 7), 365)

    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)

    // ── Daily collection (last N days) ──
    const payments = await db.payment.findMany({
      where: { organizationId: orgId, paidAt: { gte: start } },
      include: { invoice: { select: { invoiceCode: true, patient: { select: { firstName: true, lastName: true } } } } },
      orderBy: { paidAt: "desc" },
    })

    const dailyMap: Record<string, { date: string; total: number; cash: number; card: number; upi: number; other: number; count: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = { date: key, total: 0, cash: 0, card: 0, upi: 0, other: 0, count: 0 }
    }
    for (const p of payments) {
      const key = p.paidAt.toISOString().slice(0, 10)
      if (!dailyMap[key]) continue
      dailyMap[key].total += p.amount
      dailyMap[key].count++
      if (p.mode === "CASH") dailyMap[key].cash += p.amount
      else if (p.mode === "CARD") dailyMap[key].card += p.amount
      else if (p.mode === "UPI") dailyMap[key].upi += p.amount
      else dailyMap[key].other += p.amount
    }
    const daily = Object.values(dailyMap)

    // ── Mode breakdown ──
    const modeBreakdown = payments.reduce<Record<string, { mode: string; total: number; count: number }>>((acc, p) => {
      if (!acc[p.mode]) acc[p.mode] = { mode: p.mode, total: 0, count: 0 }
      acc[p.mode].total += p.amount
      acc[p.mode].count++
      return acc
    }, {})
    const modeList = Object.values(modeBreakdown).sort((a, b) => b.total - a.total)

    // ── GST report (taxable amount by GST rate) ──
    // Tests in our seed have gstRate 0, but support the computation generically.
    const invoices = await db.invoice.findMany({
      where: { organizationId: orgId, invoiceDate: { gte: start } },
      include: { items: true },
    })
    const gstBuckets: Record<string, { rate: string; taxable: number; tax: number; count: number }> = {}
    let totalTaxable = 0
    let totalTax = 0
    for (const inv of invoices) {
      for (const item of inv.items) {
        const rate = String(item.taxPercent || 0)
        if (!gstBuckets[rate]) gstBuckets[rate] = { rate: `${rate}%`, taxable: 0, tax: 0, count: 0 }
        const taxable = item.amount - item.discount
        const tax = (taxable * (item.taxPercent || 0)) / 100
        gstBuckets[rate].taxable += taxable
        gstBuckets[rate].tax += tax
        gstBuckets[rate].count++
        totalTaxable += taxable
        totalTax += tax
      }
    }
    const gst = { buckets: Object.values(gstBuckets).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate)), totalTaxable, totalTax, invoiceCount: invoices.length }

    // ── Outstanding aging ──
    const outstanding = await db.invoice.findMany({
      where: { organizationId: orgId, status: { in: ["UNPAID", "PARTIAL"] } },
      include: { patient: { select: { firstName: true, lastName: true, patientCode: true, phone: true } } },
      orderBy: { invoiceDate: "asc" },
    })
    const agingBuckets = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 } // outstanding amount
    const agingCount = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 }
    const outstandingList = outstanding.map((inv) => {
      const ageDays = Math.floor((now.getTime() - inv.invoiceDate.getTime()) / 86400000)
      if (ageDays <= 0) { agingBuckets.current += inv.balanceDue; agingCount.current++ }
      else if (ageDays <= 30) { agingBuckets.d1_30 += inv.balanceDue; agingCount.d1_30++ }
      else if (ageDays <= 60) { agingBuckets.d31_60 += inv.balanceDue; agingCount.d31_60++ }
      else { agingBuckets.d60plus += inv.balanceDue; agingCount.d60plus++ }
      return {
        id: inv.id,
        invoiceCode: inv.invoiceCode,
        patient: `${inv.patient.firstName} ${inv.patient.lastName}`,
        patientCode: inv.patient.patientCode,
        phone: inv.patient.phone,
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balanceDue: inv.balanceDue,
        status: inv.status,
        ageDays,
      }
    }).sort((a, b) => b.ageDays - a.ageDays)

    // ── P&L summary (revenue vs test cost) ──
    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
    // cost = sum of orderTests.test.cost for delivered/approved orders in range
    const costOrders = await db.testOrder.findMany({
      where: { organizationId: orgId, createdAt: { gte: start }, status: { in: ["COMPLETED", "VERIFIED", "APPROVED", "DELIVERED"] } },
      include: { orderTests: { include: { test: { select: { cost: true } } } } },
    })
    let totalCost = 0
    for (const o of costOrders) for (const ot of o.orderTests) totalCost += ot.test.cost || 0
    const grossProfit = totalRevenue - totalCost
    const margin = totalRevenue ? Math.round((grossProfit / totalRevenue) * 100) : 0

    // ── Today's collection (for daily cash closing) ──
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const todayPayments = payments.filter((p) => p.paidAt >= todayStart && p.paidAt <= todayEnd)
    const todayByMode = todayPayments.reduce<Record<string, number>>((acc, p) => {
      acc[p.mode] = (acc[p.mode] || 0) + p.amount
      return acc
    }, {})
    const todayTotal = todayPayments.reduce((s, p) => s + p.amount, 0)

    // ── Expenses (purchase orders paid in range) ──
    const expenses = await db.purchaseOrder.aggregate({
      where: { organizationId: orgId, orderDate: { gte: start } },
      _sum: { totalAmount: true },
      _count: true,
    })

    return Response.json({
      range: { days, start, end: now },
      daily,
      modeBreakdown: modeList,
      gst,
      outstanding: {
        total: outstanding.reduce((s, i) => s + i.balanceDue, 0),
        count: outstanding.length,
        buckets: agingBuckets,
        bucketCounts: agingCount,
        list: outstandingList,
      },
      pnl: {
        revenue: totalRevenue,
        cost: totalCost,
        grossProfit,
        margin,
        expenses: expenses._sum.totalAmount ?? 0,
        expenseCount: expenses._count,
        netProfit: grossProfit - (expenses._sum.totalAmount ?? 0),
      },
      today: {
        total: todayTotal,
        count: todayPayments.length,
        byMode: todayByMode,
        payments: todayPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          mode: p.mode,
          reference: p.reference,
          invoiceCode: p.invoice?.invoiceCode,
          patient: p.invoice ? `${p.invoice.patient.firstName} ${p.invoice.patient.lastName}` : "—",
          paidAt: p.paidAt,
        })),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
