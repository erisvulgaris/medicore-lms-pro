import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

// Audit log with date-range, entity, and action filtering + CSV export support.
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("audit.view")
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 1000)
    const entity = searchParams.get("entity")
    const action = searchParams.get("action")
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = { organizationId: user.organizationId }
    if (entity && entity !== "ALL") where.entity = entity
    if (action && action !== "ALL") where.action = { contains: action }
    if (userId && userId !== "ALL") where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate + "T00:00:00")
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59")
    }

    const [logs, totalCount] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // Get unique entities + actions for filter dropdowns
    const allLogs = await db.auditLog.findMany({
      where: { organizationId: user.organizationId },
      select: { entity: true, action: true },
      distinct: ["entity", "action"],
      take: 500,
    })
    const entities = [...new Set(allLogs.map((l) => l.entity))].sort()
    const actions = [...new Set(allLogs.map((l) => l.action))].sort()

    return Response.json({ logs, totalCount, entities, actions })
  } catch (e) {
    return errorResponse(e)
  }
}
