import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser, errorResponse } from "@/lib/session"

// Returns the current authenticated user + organization info.
// Used by the frontend to bootstrap the session on page load.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ user: null, organization: null })
    }
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, code: true, accentColor: true, logoUrl: true, city: true, gstin: true },
    })
    const branch = user.branchId
      ? await db.branch.findUnique({ where: { id: user.branchId }, select: { id: true, name: true, code: true } })
      : null
    return Response.json({ user, organization: org, branch })
  } catch (e) {
    return errorResponse(e)
  }
}
