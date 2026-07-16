import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { verifyPassword, hashPassword } from "@/lib/auth"
import { validateBody } from "@/lib/validation"
import { z } from "zod"
import { checkRateLimit } from "@/lib/rate-limit"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()

    // Rate limit: max 5 password changes per hour per IP
    const ip = req.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(`pwchange:${ip}`, 5, 3600)) {
      return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
    }

    const body = await validateBody(req, changePasswordSchema)

    if (body.newPassword === body.currentPassword) {
      return Response.json({ error: "New password must be different from current" }, { status: 400 })
    }

    const fullUser = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, email: true } })
    if (!fullUser) return errorResponse(new Error("NOT_FOUND"))

    const valid = await verifyPassword(body.currentPassword, fullUser.passwordHash)
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    const newHash = await hashPassword(body.newPassword)
    await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

    // Revoke all other sessions (keep current)
    // The frontend will need to re-login on other devices
    await db.session.deleteMany({ where: { userId: user.id } })

    await logAudit({
      organizationId: user.organizationId,
      userId: user.id,
      action: "PASSWORD_CHANGE",
      entity: "User",
      entityId: user.id,
      details: "User changed their password",
    })

    return Response.json({ ok: true, message: "Password changed. Please log in again." })
  } catch (e) {
    return errorResponse(e)
  }
}
