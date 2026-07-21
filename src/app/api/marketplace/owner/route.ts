import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/owner — lab owner dashboard data
// Returns the marketplace lab profile for the logged-in org owner/admin,
// their marketplace orders, revenue, reviews, and analytics.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    // Find the marketplace lab for this org
    const lab = await db.marketplaceLab.findUnique({
      where: { organizationId: user.organizationId },
      include: {
        reviews: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    })

    if (!lab) {
      return Response.json({ lab: null, hasLab: false, message: "Your organization is not published on the marketplace yet." })
    }

    // Get marketplace orders for this lab
    const orders = await db.marketplaceOrder.findMany({
      where: { labId: lab.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    // Analytics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const totalOrders = orders.length
    const ordersThisMonth = orders.filter((o) => o.createdAt >= startOfMonth).length
    const ordersPrevMonth = orders.filter((o) => o.createdAt >= startOfPrevMonth && o.createdAt <= endOfPrevMonth).length

    const revenue = orders.filter((o) => o.paymentStatus === "PAID" || o.paymentMode === "COD").reduce((s, o) => s + o.totalAmount, 0)
    const revenueThisMonth = orders.filter((o) => o.createdAt >= startOfMonth && (o.paymentStatus === "PAID" || o.paymentMode === "COD")).reduce((s, o) => s + o.totalAmount, 0)

    const platformFeeEarned = orders.reduce((s, o) => s + o.platformFee, 0)
    const netRevenue = revenue - platformFeeEarned

    // Status breakdown
    const statusBreakdown: Record<string, number> = {}
    for (const o of orders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1
    }

    // Recent orders with test details
    const recentOrders = orders.slice(0, 10).map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      patientName: o.patientName,
      patientPhone: o.patientPhone,
      totalAmount: o.totalAmount,
      status: o.status,
      paymentMode: o.paymentMode,
      paymentStatus: o.paymentStatus,
      homeCollection: o.homeCollection,
      preferredDate: o.preferredDate,
      pickupOtp: o.pickupOtp,
      createdAt: o.createdAt,
      tests: JSON.parse(o.testsJson),
    }))

    // Daily revenue trend (last 14 days)
    const trend: { date: string; revenue: number; orders: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59)
      const dayOrders = orders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd)
      trend.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: dayOrders.length,
      })
    }

    // Review analytics
    const reviews = lab.reviews || []
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : lab.rating
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const r of reviews) ratingDistribution[r.rating as keyof typeof ratingDistribution]++

    return Response.json({
      lab: { ...lab, reviews: undefined },
      hasLab: true,
      stats: {
        totalOrders,
        ordersThisMonth,
        ordersPrevMonth,
        revenue,
        revenueThisMonth,
        platformFeeEarned,
        netRevenue,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
        ratingDistribution,
      },
      statusBreakdown,
      recentOrders,
      trend,
      reviews,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

// PATCH /api/marketplace/owner — update lab profile
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    const body = await req.json()
    const lab = await db.marketplaceLab.findUnique({ where: { organizationId: user.organizationId } })
    if (!lab) return Response.json({ error: "No marketplace lab profile found" }, { status: 404 })

    const allowed = ["displayName", "description", "logoUrl", "coverUrl", "address", "city", "state", "postalCode", "phone", "whatsapp", "email", "website", "openTime", "closeTime", "open24x7", "homeCollection", "homeCollectionFee", "homeCollectionRadius", "parking", "wheelchairAccess", "emergencyService"]
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) data[key] = body[key]
    }

    const updated = await db.marketplaceLab.update({ where: { id: lab.id }, data })
    return Response.json({ lab: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
