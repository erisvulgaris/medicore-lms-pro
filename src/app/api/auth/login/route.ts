import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, createSession, getRequestInfo } from "@/lib/auth"
import { errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { checkRateLimit, getRemainingAttempts } from "@/lib/rate-limit"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// Brute-force protection: max 10 login attempts per 15 minutes per IP
const MAX_LOGIN_ATTEMPTS = 10
const LOGIN_WINDOW_SECONDS = 900 // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 })
    }
    const { email, password } = parsed.data

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const rateKey = `login:${ip}`
    if (!checkRateLimit(rateKey, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_SECONDS)) {
      const remaining = getRemainingAttempts(rateKey, MAX_LOGIN_ATTEMPTS)
      return Response.json(
        { error: `Too many login attempts. Please try again in ${Math.ceil(LOGIN_WINDOW_SECONDS / 60)} minutes.` },
        { status: 429 }
      )
    }

    // Find user by email across all orgs (email is unique per org, but login is by email globally)
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

