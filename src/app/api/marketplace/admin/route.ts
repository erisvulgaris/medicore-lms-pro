import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/admin — super admin marketplace overview
export async function GET(req: NextRequest) {
  try {
    await requirePermission("settings.manage")
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tab = searchParams.get("tab") || "overview"

    // Overview stats
    const [labs, orders, reviews, coupons] = await Promise.all([
      db.marketplaceLab.findMany({ include: { _count: { select: { reviews: true, marketplaceOrders: true } } }, orderBy: { createdAt: "desc" } }),
      db.marketplaceOrder.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { lab: { select: { displayName: true, slug: true } } } }),
      db.labReview.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { lab: { select: { displayName: true } } } }),
      db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    ])

    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0)
    const platformRevenue = orders.reduce((s, o) => s + o.platformFee, 0)
    const activeLabs = labs.filter((l) => l.active).length
    const verifiedLabs = labs.filter((l) => l.verified).length
    const featuredLabs = labs.filter((l) => l.featured).length
    const reportedReviews = reviews.filter((r) => r.reported).length

    // Status breakdown
    const statusBreakdown: Record<string, number> = {}
    for (const o of orders) statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1

    // Top labs by orders
    const labStats = labs.map((l) => ({
      ...l,
      orderCount: l._count.marketplaceOrders,
      reviewCount: l._count.reviews,
    })).sort((a, b) => b.orderCount - a.orderCount)

    return Response.json({
      overview: {
        totalLabs: labs.length,
        activeLabs,
        verifiedLabs,
        featuredLabs,
        totalOrders: orders.length,
        totalRevenue,
        platformRevenue,
        totalReviews: reviews.length,
        reportedReviews,
        totalCoupons: coupons.length,
        statusBreakdown,
      },
      labs: labStats,
      orders: orders.slice(0, 50),
      reviews: reviews.slice(0, 50),
      coupons,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
