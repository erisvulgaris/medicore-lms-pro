import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { logAudit } from "@/lib/audit"

// GET /api/marketplace/pickup — pickup agent dashboard (assigned orders for this org)
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "PHLEBOTOMIST", "LAB_TECHNICIAN"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    const lab = await db.marketplaceLab.findUnique({ where: { organizationId: user.organizationId } })
    if (!lab) return Response.json({ orders: [], stats: { pending: 0, collected: 0, total: 0 } })

    // Get orders that need pickup (ASSIGNED or COLLECTED status, home collection)
    const orders = await db.marketplaceOrder.findMany({
      where: {
        labId: lab.id,
        homeCollection: true,
        status: { in: ["PLACED", "ASSIGNED", "COLLECTED"] },
      },
      orderBy: { preferredDate: "asc" },
      take: 50,
    })

    const stats = {
      pending: orders.filter((o) => o.status === "PLACED" || o.status === "ASSIGNED").length,
      collected: orders.filter((o) => o.status === "COLLECTED").length,
      total: orders.length,
    }

    // Group by area (city)
    const routes: Record<string, any[]> = {}
    for (const o of orders) {
      const area = o.city || "Unknown"
      if (!routes[area]) routes[area] = []
      routes[area].push({
        id: o.id,
        orderCode: o.orderCode,
        patientName: o.patientName,
        patientPhone: o.patientPhone,
        address: o.address,
        city: o.city,
        preferredDate: o.preferredDate,
        timeSlot: o.timeSlot,
        status: o.status,
        pickupOtp: o.pickupOtp,
        tests: JSON.parse(o.testsJson),
        totalAmount: o.totalAmount,
      })
    }

    return Response.json({
      orders: orders.map((o) => ({
        id: o.id, orderCode: o.orderCode, patientName: o.patientName, patientPhone: o.patientPhone,
        address: o.address, city: o.city, preferredDate: o.preferredDate, timeSlot: o.timeSlot,
        status: o.status, pickupOtp: o.pickupOtp, tests: JSON.parse(o.testsJson), totalAmount: o.totalAmount,
      })),
      stats,
      routes: Object.entries(routes).map(([area, items]) => ({ area, count: items.length, items })),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

// PATCH /api/marketplace/pickup — verify OTP and mark collected
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "PHLEBOTOMIST", "LAB_TECHNICIAN"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    const body = await req.json()
    const { orderId, otp, action } = body as { orderId: string; otp?: string; action: "collect" | "assign" }

    const lab = await db.marketplaceLab.findUnique({ where: { organizationId: user.organizationId } })
    if (!lab) return Response.json({ error: "No lab found" }, { status: 404 })

    const order = await db.marketplaceOrder.findFirst({ where: { id: orderId, labId: lab.id } })
    if (!order) return errorResponse(new Error("NOT_FOUND"))

    if (action === "assign") {
      const updated = await db.marketplaceOrder.update({ where: { id: orderId }, data: { status: "ASSIGNED", pickupAgentId: user.id } })
      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "PICKUP_ASSIGNED", entity: "MarketplaceOrder", entityId: orderId, details: `${order.orderCode} assigned to ${user.name}` })
      return Response.json({ order: updated })
    }

    if (action === "collect") {
      // Verify OTP
      if (order.pickupOtp && otp !== order.pickupOtp) {
        return Response.json({ error: "Invalid OTP. Please ask the patient for the correct code." }, { status: 400 })
      }
      const updated = await db.marketplaceOrder.update({ where: { id: orderId }, data: { status: "COLLECTED" } })
      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "PICKUP_COLLECTED", entity: "MarketplaceOrder", entityId: orderId, details: `${order.orderCode} sample collected` })
      return Response.json({ order: updated })
    }

    return Response.json({ error: "Invalid action" }, { status: 400 })
  } catch (e) {
    return errorResponse(e)
  }
}
