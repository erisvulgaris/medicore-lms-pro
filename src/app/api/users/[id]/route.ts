import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { hashPassword } from "@/lib/auth"
import { validateBody } from "@/lib/validation"
import { z } from "zod"
import { ROLES } from "@/lib/permissions"

const userUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(Object.keys(ROLES) as [string, ...string[]]).optional(),
  branchId: z.string().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
  resetPassword: z.string().min(8).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requirePermission("users.manage")
    const { id } = await params
    const body = await validateBody(req, userUpdateSchema)

    const target = await db.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
    })
    if (!target) return errorResponse(new Error("NOT_FOUND"))

    // Prevent disabling yourself
    if (body.active === false && id === currentUser.id) {
      return Response.json({ error: "You cannot disable your own account" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.role !== undefined) data.role = body.role
    if (body.branchId !== undefined) data.branchId = body.branchId || null
    if (body.phone !== undefined) data.phone = body.phone
    if (body.active !== undefined) data.active = body.active
    if (body.resetPassword) {
      data.passwordHash = await hashPassword(body.resetPassword)
      // Revoke all sessions for this user (force re-login)
      await db.session.deleteMany({ where: { userId: id } })
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, branchId: true, phone: true, active: true },
    })

    await logAudit({
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: "UPDATE_USER",
      entity: "User",
      entityId: id,
      details: `Updated ${target.email}: ${Object.keys(data).join(", ")}`,
    })

    return Response.json({ user: updated, newPassword: body.resetPassword || undefined })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requirePermission("users.manage")
    const { id } = await params

    if (id === currentUser.id) {
      return Response.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    const target = await db.user.findFirst({
      where: { id, organizationId: currentUser.organizationId },
    })
    if (!target) return errorResponse(new Error("NOT_FOUND"))

    // Soft-disable instead of hard-delete to preserve audit history
    await db.user.update({ where: { id }, data: { active: false } })
    await db.session.deleteMany({ where: { userId: id } })

    await logAudit({
      organizationId: currentUser.organizationId,
      userId: currentUser.id,
      action: "DISABLE_USER",
      entity: "User",
      entityId: id,
      details: `Disabled ${target.email}`,
    })

    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
