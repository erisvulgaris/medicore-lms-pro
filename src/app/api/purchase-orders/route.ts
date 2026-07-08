import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("purchases.read")
    const pos = await db.purchaseOrder.findMany({
      where: { organizationId: user.organizationId },
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    })
    return Response.json({ purchaseOrders: pos })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("purchases.write")
    const body = await req.json()
    const { supplierId, items, notes } = body as { supplierId: string; items: { itemName: string; itemId?: string; quantity: number; rate: number }[]; notes?: string }
    const total = items.reduce((s, i) => s + i.quantity * i.rate, 0)
    const count = await db.purchaseOrder.count({ where: { organizationId: user.organizationId } })
    const poCode = `PO-${4001 + count}`
    const po = await db.purchaseOrder.create({
      data: {
        organizationId: user.organizationId,
        poCode,
        supplierId,
        status: "SENT",
        totalAmount: total,
        notes,
        items: { create: items.map((i) => ({ itemName: i.itemName, itemId: i.itemId, quantity: Number(i.quantity), rate: Number(i.rate), amount: Number(i.quantity) * Number(i.rate) })) },
      },
      include: { items: true },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE", entity: "PurchaseOrder", entityId: po.id, details: `${poCode} ₹${total}` })
    return Response.json(po, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
