import { db } from "@/lib/db"

export async function logAudit(opts: {
  organizationId: string
  userId?: string | null
  action: string
  entity: string
  entityId?: string
  details?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        organizationId: opts.organizationId,
        userId: opts.userId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        details: opts.details ?? null,
      },
    })
  } catch {
    // audit logging must never break the main operation
  }
}
