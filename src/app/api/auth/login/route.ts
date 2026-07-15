import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, createSession, getRequestInfo } from "@/lib/auth"
import { errorResponse, validationError } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 })
    }
    const { email, password } = parsed.data

    // Find user by email across all orgs (email is unique per org, but login is by email globally)
    // SQLite doesn't support mode: "insensitive", so we fetch by exact email (emails are stored lowercase in seed)
    const user = await db.user.findFirst({
      where: { email: email.toLowerCase(), active: true },
      include: { organization: { select: { name: true, code: true, accentColor: true, logoUrl: true, city: true } } },
    })
    if (!user) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return Response.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const info = await getRequestInfo()
    const { token, expiresAt } = await createSession(
      { id: user.id, organizationId: user.organizationId, role: user.role, name: user.name, email: user.email },
      info
    )

    // Update lastLoginAt
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, details: `Login from ${info.ipAddress || "unknown"}`, ipAddress: info.ipAddress ?? undefined })

    return Response.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        branchId: user.branchId,
      },
      organization: user.organization,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
