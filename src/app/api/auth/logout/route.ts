import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { extractToken, revokeSession } from "@/lib/auth"
import { requireUser, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const token = await extractToken()
    if (token) await revokeSession(token)
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "LOGOUT", entity: "User", entityId: user.id })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
