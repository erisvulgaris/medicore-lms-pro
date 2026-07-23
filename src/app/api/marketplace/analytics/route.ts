import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/analytics — super admin marketplace analytics
export async function GET(req: NextRequest) {
  try {
    await requirePermission("settings.manage")
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "30"
    const days = Math.min(Math.max(parseInt(range), 7), 365)
    const start = new Date(Date.now() - days * 86400000)

    const orders = await db.marketplaceOrder.findMany({
      where: { createdAt: { gte: start } },
      include: { lab: { select: { displayName: true, slug: true, city: true } } },
      orderBy: { createdAt: "desc" },
      take: 1000,
    })

    const totalGMV = orders.reduce((s, o) => s + o.totalAmount, 0)
    const platformRevenue = orders.reduce((s, o) => s + o.platformFee, 0)
    const totalOrders = orders.length
    const uniqueCustomers = new Set(orders.map((o) => o.patientPhone)).size
    const completedOrders = orders.filter((o) => o.status === "DELIVERED" || o.status === "COMPLETED").length
    const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length
    const conversionRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0
    const avgOrderValue = totalOrders ? Math.round(totalGMV / totalOrders) : 0
    const homeCollectionRate = totalOrders ? Math.round((orders.filter((o) => o.homeCollection).length / totalOrders) * 100) : 0

    // Daily trend
    const dailyMap: Record<string, { date: string; gmv: number; orders: number }> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dailyMap[d] = { date: d, gmv: 0, orders: 0 }
    }
    for (const o of orders) {
      const d = o.createdAt.toISOString().slice(0, 10)
      if (d in dailyMap) { dailyMap[d].gmv += o.totalAmount; dailyMap[d].orders++ }
    }
    const trend = Object.values(dailyMap)

    // Top labs by GMV
    const labMap: Record<string, { name: string; slug: string; city: string; gmv: number; orders: number }> = {}
    for (const o of orders) {
      if (!o.lab) continue
      if (!labMap[o.labId]) labMap[o.labId] = { name: o.lab.displayName, slug: o.lab.slug, city: o.lab.city, gmv: 0, orders: 0 }
      labMap[o.labId].gmv += o.totalAmount
      labMap[o.labId].orders++
    }
    const topLabs = Object.values(labMap).sort((a, b) => b.gmv - a.gmv).slice(0, 10)

    // City distribution
    const cityMap: Record<string, { city: string; orders: number; gmv: number }> = {}
    for (const o of orders) {
      const city = o.city || "Unknown"
      if (!cityMap[city]) cityMap[city] = { city, orders: 0, gmv: 0 }
      cityMap[city].orders++
      cityMap[city].gmv += o.totalAmount
    }
    const cities = Object.values(cityMap).sort((a, b) => b.gmv - a.gmv)

    // Status distribution
    const statusDist: Record<string, number> = {}
    for (const o of orders) statusDist[o.status] = (statusDist[o.status] || 0) + 1

    return Response.json({
      overview: { totalGMV, platformRevenue, totalOrders, uniqueCustomers, completedOrders, cancelledOrders, conversionRate, avgOrderValue, homeCollectionRate },
      trend,
      topLabs,
      cities,
      statusDist,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
