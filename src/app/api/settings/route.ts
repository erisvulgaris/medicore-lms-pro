import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("settings.manage")
    const settings = await db.setting.findMany({ where: { organizationId: user.organizationId } })
    const org = await db.organization.findUnique({ where: { id: user.organizationId } })
    const branches = await db.branch.findMany({ where: { organizationId: user.organizationId } })
    return Response.json({ settings: Object.fromEntries(settings.map((s) => [s.key, s.value])), organization: org, branches })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission("settings.manage")
    const body = await req.json()
    const { settings, organization } = body
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await db.setting.upsert({
          where: { organizationId_key: { organizationId: user.organizationId, key } },
          create: { organizationId: user.organizationId, key, value: String(value) },
          update: { value: String(value) },
        })
      }
    }
    if (organization) {
      await db.organization.update({
        where: { id: user.organizationId },
        data: {
          name: organization.name,
          legalName: organization.legalName,
          email: organization.email,
          phone: organization.phone,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          gstin: organization.gstin,
          accentColor: organization.accentColor,
        },
      })
    }
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
