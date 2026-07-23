import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

// PATCH /api/marketplace/admin/orders/[id] — admin update any order status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("settings.manage")
    const { id } = await params
    const body = await req.json()
    const { status, paymentStatus } = body

    const order = await db.marketplaceOrder.findUnique({ where: { id } })
    if (!order) return errorResponse(new Error("NOT_FOUND"))

    const data: any = {}
    if (status) {
      const valid = ["PLACED", "ASSIGNED", "COLLECTED", "IN_LAB", "TESTING", "COMPLETED", "DELIVERED", "CANCELLED"]
      if (!valid.includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 })
      data.status = status
    }
    if (paymentStatus) {
      const valid = ["PENDING", "PAID", "FAILED", "REFUNDED"]
      if (!valid.includes(paymentStatus)) return Response.json({ error: "Invalid payment status" }, { status: 400 })
      data.paymentStatus = paymentStatus
    }

    const updated = await db.marketplaceOrder.update({ where: { id }, data })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "ADMIN_ORDER_UPDATE", entity: "MarketplaceOrder", entityId: id, details: `${order.orderCode}: ${JSON.stringify(data)}` })
    return Response.json({ order: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
