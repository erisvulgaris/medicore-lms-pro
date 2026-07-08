import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("audit.view")
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
    const logs = await db.auditLog.findMany({
      where: { organizationId: user.organizationId },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return Response.json({ logs })
  } catch (e) {
    return errorResponse(e)
  }
}
