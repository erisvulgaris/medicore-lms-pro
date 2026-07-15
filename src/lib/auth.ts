import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { db } from "@/lib/db"
import { headers } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production-please-use-a-long-random-string"
const SESSION_EXPIRY_DAYS = 7
const BCRYPT_ROUNDS = 12

// ── Password hashing ──
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  // Support both the legacy demo hash (non-bcrypt) and real bcrypt hashes.
  // The seed previously stored a placeholder; real seeds now use bcrypt.
  if (!hash.startsWith("$2")) return false
  return bcrypt.compare(plain, hash)
}

// ── Token generation ──
export interface TokenPayload {
  sub: string // userId
  org: string // organizationId
  role: string
  name: string
  email: string
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_EXPIRY_DAYS}d` })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// ── Session management ──
export async function createSession(user: { id: string; organizationId: string; role: string; name: string; email: string }, opts?: { ipAddress?: string; userAgent?: string }) {
  const token = signToken({ sub: user.id, org: user.organizationId, role: user.role, name: user.name, email: user.email })
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 86400000)
  await db.session.create({
    data: {
      token,
      userId: user.id,
      organizationId: user.organizationId,
      expiresAt,
      ipAddress: opts?.ipAddress ?? null,
      userAgent: opts?.userAgent ?? null,
    },
  })
  // clean up expired sessions for this user
  await db.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } }).catch(() => {})
  return { token, expiresAt }
}

export async function revokeSession(token: string): Promise<void> {
  try {
    await db.session.delete({ where: { token } })
  } catch {
    // already deleted or invalid
  }
}

// ── Extract token from request ──
export async function extractToken(): Promise<string | null> {
  const h = await headers()
  const auth = h.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  // fallback to cookie
  const cookie = h.get("cookie") || ""
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/)
  if (match) return match[1]
  return null
}

export async function getRequestInfo() {
  const h = await headers()
  return {
    ipAddress: h.get("x-forwarded-for") || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent") || null,
  }
}
