import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("tests.read")
    const profiles = await db.testProfile.findMany({
      where: { organizationId: user.organizationId, active: true },
      include: { items: { include: { test: { select: { name: true, shortName: true, code: true, unit: true } } } } },
      orderBy: { name: "asc" },
    })
    const packages = await db.testPackage.findMany({
      where: { organizationId: user.organizationId, active: true },
      include: { items: { include: { test: { select: { name: true, shortName: true, code: true } } } } },
      orderBy: { name: "asc" },
    })
    return Response.json({ profiles, packages })
  } catch (e) {
    return errorResponse(e)
  }
}
