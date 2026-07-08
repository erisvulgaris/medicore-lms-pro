import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      const users = await db.user.findMany({
        where: { active: true },
        select: { id: true, name: true, email: true, role: true, organizationId: true, branchId: true },
        orderBy: { role: "asc" },
      })
      const org = await db.organization.findFirst({ select: { id: true, name: true, code: true, accentColor: true, logoUrl: true, city: true, gstin: true } })
      return Response.json({ user: null, demoUsers: users, organization: org })
    }
    const org = await db.organization.findUnique({ where: { id: user.organizationId }, select: { id: true, name: true, code: true, accentColor: true, logoUrl: true, city: true, gstin: true } })
    return Response.json({ user, organization: org })
  } catch (e) {
    return errorResponse(e)
  }
}
