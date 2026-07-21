import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { FEATURE_FLAGS, refreshFlagCache } from "@/lib/feature-flags"
import { logAudit } from "@/lib/audit"

// GET: list all feature flags (admin only)
export async function GET(req: NextRequest) {
  try {
    await requirePermission("settings.manage")
    let flags = await db.featureFlag.findMany({ orderBy: { key: "asc" } })
    // Ensure all defined flags exist
    for (const def of Object.values(FEATURE_FLAGS)) {
      if (!flags.find((f) => f.key === def.key)) {
        await db.featureFlag.create({ data: { key: def.key, label: def.label, description: def.description, enabled: false } })
      }
    }
    flags = await db.featureFlag.findMany({ orderBy: { key: "asc" } })
    return Response.json({ flags })
  } catch (e) {
    return errorResponse(e)
  }
}

// PATCH: toggle a feature flag (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePermission("settings.manage")
    const body = await req.json()
    const { key, enabled } = body as { key: string; enabled: boolean }
    const def = Object.values(FEATURE_FLAGS).find((f) => f.key === key)
    if (!def) return Response.json({ error: "Unknown feature flag" }, { status: 400 })

    const flag = await db.featureFlag.upsert({
      where: { key },
      create: { key, label: def.label, description: def.description, enabled, updatedById: user.id },
      update: { enabled, updatedById: user.id },
    })
    await refreshFlagCache()
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "TOGGLE_FEATURE_FLAG", entity: "FeatureFlag", entityId: flag.id, details: `${def.label}: ${enabled ? "ENABLED" : "DISABLED"}` })
    return Response.json({ flag })
  } catch (e) {
    return errorResponse(e)
  }
}
