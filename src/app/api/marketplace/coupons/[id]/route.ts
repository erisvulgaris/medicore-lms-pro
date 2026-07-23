import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

// PATCH /api/marketplace/coupons/[id] — update coupon
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("settings.manage")
    const { id } = await params
    const body = await req.json()
    const coupon = await db.coupon.update({ where: { id }, data: { ...body, validTo: body.validTo ? new Date(body.validTo) : undefined } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "UPDATE_COUPON", entity: "Coupon", entityId: id, details: `Updated ${coupon.code}` })
    return Response.json({ coupon })
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/marketplace/coupons/[id] — delete coupon
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("settings.manage")
    const { id } = await params
    const coupon = await db.coupon.delete({ where: { id } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "DELETE_COUPON", entity: "Coupon", entityId: id, details: `Deleted ${coupon.code}` })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
