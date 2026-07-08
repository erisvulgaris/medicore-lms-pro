import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("inventory.write")
    const { id } = await params
    const body = await req.json()
    const { stockQty, type, reason } = body as { stockQty: number; type?: string; reason?: string }
    const item = await db.inventoryItem.findFirst({ where: { id, organizationId: user.organizationId } })
    if (!item) return errorResponse(new Error("NOT_FOUND"))
    const diff = Number(stockQty) - item.stockQty
    const updated = await db.inventoryItem.update({ where: { id }, data: { stockQty: Number(stockQty) } })
    await db.stockMovement.create({ data: { itemId: id, type: type || "ADJUST", quantity: Math.abs(diff), balance: Number(stockQty), notes: reason || "Manual adjustment" } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "STOCK_ADJUST", entity: "InventoryItem", entityId: id, details: `${item.name}: ${item.stockQty} → ${stockQty}` })
    return Response.json(updated)
  } catch (e) {
    return errorResponse(e)
  }
}
