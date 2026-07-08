import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("tests.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const category = searchParams.get("category")
    const tests = await db.test.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        ...(q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }, { shortName: { contains: q } }] } : {}),
        ...(category ? { categoryId: category } : {}),
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ department: "asc" }, { name: "asc" }],
    })
    const categories = await db.testCategory.findMany({ where: { organizationId: user.organizationId }, orderBy: { name: "asc" } })
    return Response.json({ tests, categories })
  } catch (e) {
    return errorResponse(e)
  }
}
