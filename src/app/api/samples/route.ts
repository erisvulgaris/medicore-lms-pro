import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("samples.read")
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const q = searchParams.get("q") || ""
    const samples = await db.sample.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status && status !== "ALL" ? { status } : {}),
        ...(q ? { OR: [{ barcode: { contains: q } }, { sampleCode: { contains: q } }, { order: { orderCode: { contains: q } } }, { order: { patient: { firstName: { contains: q } } } }, { order: { patient: { lastName: { contains: q } } } }] } : {}),
      },
      include: {
        order: { include: { patient: { select: { firstName: true, lastName: true, patientCode: true } } } },
        collectedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return Response.json({ samples })
  } catch (e) {
    return errorResponse(e)
  }
}
