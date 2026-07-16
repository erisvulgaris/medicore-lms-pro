import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { hashPassword } from "@/lib/auth"
import { validateBody } from "@/lib/validation"
import { z } from "zod"
import { ROLES } from "@/lib/permissions"

const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email"),
  role: z.enum(Object.keys(ROLES) as [string, ...string[]]),
  branchId: z.string().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  active: z.boolean().optional(),
})

// List all users (admin only)
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

// Create a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const currentUser = await requirePermission("users.manage")
    const body = await validateBody(req, userCreateSchema)

    // Check email uniqueness within org
    const existing = await db.user.findFirst({
      where: { organizationId: currentUser.organizationId, email: body.email.toLowerCase() },
    })
    if (existing) {
      return Response.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const passwordHash = await hashPassword(body.password)
    const user = await db.user.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: body.branchId || null,
        name: body.name,
        email: body.email.toLowerCase(),
        role: body.role,
        phone: body.phone ?? null,
        passwordHash,
        active: body.active ?? true,
      },
      select: { id: true, name: true, email: true, role: true, branchId: true, phone: true, active: true, createdAt: true },
    })

    await logAudit({
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      details: `Created user ${user.email} (${user.role})`,
    })

    return Response.json({ user, password: body.password }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
