import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("users.manage")
    const users = await db.user.findMany({
      where: { organizationId: user.organizationId },
      include: { branch: { select: { name: true, code: true } } },
      orderBy: { role: "asc" },
    })
    const branches = await db.branch.findMany({ where: { organizationId: user.organizationId } })
    return Response.json({ users: users.map((u) => ({ ...u, passwordHash: undefined })), branches })
  } catch (e) {
    return errorResponse(e)
  }
}
