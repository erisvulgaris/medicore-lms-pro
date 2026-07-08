import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("purchases.read")
    const suppliers = await db.supplier.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: "asc" },
    })
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: { organizationId: user.organizationId },
      include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return Response.json({ suppliers, purchaseOrders })
  } catch (e) {
    return errorResponse(e)
  }
}
