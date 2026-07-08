import { headers } from "next/headers"
import { db } from "@/lib/db"
import { hasPermission, type Permission } from "@/lib/permissions"

export interface SessionUser {
  id: string
  organizationId: string
  branchId: string | null
  name: string
  email: string
  role: string
}

// Demo session: resolves current user from `x-user-id` header.
// In production this would be replaced by NextAuth/Better Auth session resolution.
// RBAC is still enforced at the API layer via requirePermission.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const h = await headers()
  const userId = h.get("x-user-id")
  if (!userId) return null
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, branchId: true, name: true, email: true, role: true },
  })
  return user ?? null
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
  return Response.json({ error: msg }, { status: 500 })
}
