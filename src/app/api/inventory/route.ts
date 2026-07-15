import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { validateBody, inventoryCreateSchema } from "@/lib/validation"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("inventory.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const category = searchParams.get("category")
    const lowStock = searchParams.get("lowStock") === "true"
    const items = await db.inventoryItem.findMany({
      where: {
        organizationId: user.organizationId,
        ...(q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }] } : {}),
        ...(category && category !== "ALL" ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })
    const filtered = lowStock ? items.filter((i) => i.stockQty <= i.reorderLevel) : items
    return Response.json({ items: filtered })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("inventory.write")
    const body = await validateBody(req, inventoryCreateSchema)
    const item = await db.inventoryItem.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        name: body.name,
        code: body.code,
        category: body.category,
        unit: body.unit,
        stockQty: Number(body.stockQty) || 0,
        reorderLevel: Number(body.reorderLevel) || 0,
        reorderQty: Number(body.reorderQty) || 0,
        costPerUnit: Number(body.costPerUnit) || 0,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        batchNo: body.batchNo,
        location: body.location,
      },
    })
    await db.stockMovement.create({ data: { itemId: item.id, type: "IN", quantity: item.stockQty, balance: item.stockQty, reference: "Initial stock", notes: "Created" } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE", entity: "InventoryItem", entityId: item.id, details: item.name })
    return Response.json(item, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
