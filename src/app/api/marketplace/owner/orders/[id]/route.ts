import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { logAudit } from "@/lib/audit"

// PATCH /api/marketplace/owner/orders/[id] — update order status (lab owner)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    if (!["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "LAB_TECHNICIAN", "PATHOLOGIST"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status } = body as { status: string }

    const validStatuses = ["PLACED", "ASSIGNED", "COLLECTED", "IN_LAB", "TESTING", "COMPLETED", "DELIVERED", "CANCELLED"]
    if (!validStatuses.includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 })
    }

    // Find the lab for this org
    const lab = await db.marketplaceLab.findUnique({ where: { organizationId: user.organizationId } })
    if (!lab) return Response.json({ error: "No marketplace lab found" }, { status: 404 })

    // Find the order (must belong to this lab)
    const order = await db.marketplaceOrder.findFirst({ where: { id, labId: lab.id } })
    if (!order) return errorResponse(new Error("NOT_FOUND"))

    const updated = await db.marketplaceOrder.update({
      where: { id },
      data: { status },
    })

    await logAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "ORDER_STATUS_UPDATE",
      entity: "MarketplaceOrder",
      entityId: id,
      details: `${order.orderCode}: ${order.status} → ${status}`,
    })

    return Response.json({ order: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
