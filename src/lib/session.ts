import { headers } from "next/headers"
import { db } from "@/lib/db"
import { hasPermission, type Permission } from "@/lib/permissions"
import { extractToken, verifyToken } from "@/lib/auth"
import { logger } from "@/lib/logger"

export interface SessionUser {
  id: string
  organizationId: string
  branchId: string | null
  name: string
  email: string
  role: string
}

// Resolve the current user from a Bearer token (JWT) stored in the Session table.
// This is the production auth path — replaces the demo header-based approach.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await extractToken()
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  // Verify the session is still valid in the DB (not revoked, not expired)
  const session = await db.session.findUnique({
    where: { token },
    select: { id: true, expiresAt: true, userId: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) return null

  // Touch lastUsedAt
  db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, organizationId: true, branchId: true, name: true, email: true, role: true, active: true },
  })
  if (!user || !user.active) return null

  return {
    id: user.id,
    organizationId: user.organizationId,
    branchId: user.branchId,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error("UNAUTHORIZED")
  return user
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser()
  if (!hasPermission(user.role, permission)) throw new Error("FORBIDDEN")
  return user
}

export function errorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : "Internal error"
  if (msg === "UNAUTHORIZED") return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (msg === "FORBIDDEN") return Response.json({ error: "Forbidden" }, { status: 403 })
  if (msg === "NOT_FOUND") return Response.json({ error: "Not found" }, { status: 404 })
  if (msg === "VALIDATION_ERROR") return Response.json({ error: (error as any).details ?? "Validation failed" }, { status: 400 })
  logger.error("Unhandled API error", { message: msg, stack: error instanceof Error ? error.stack : undefined })
  return Response.json({ error: msg }, { status: 500 })
}

// Helper for Zod validation errors
export function validationError(details: string): Error {
  const e = new Error("VALIDATION_ERROR")
  ;(e as any).details = details
  return e
}
