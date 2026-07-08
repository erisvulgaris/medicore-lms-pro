import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { randomToken } from "@/lib/format"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("reports.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const reports = await db.report.findMany({
      where: {
        organizationId: user.organizationId,
        ...(q ? { OR: [{ reportCode: { contains: q } }, { order: { orderCode: { contains: q } } }, { order: { patient: { firstName: { contains: q } } } }, { order: { patient: { lastName: { contains: q } } } }] } : {}),
      },
      include: {
        order: {
          include: {
            patient: { select: { firstName: true, lastName: true, patientCode: true, gender: true, age: true, phone: true } },
            doctor: { select: { name: true, specialization: true } },
            orderTests: { include: { test: { select: { name: true, shortName: true, department: true } }, results: true } },
          },
        },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return Response.json({ reports })
  } catch (e) {
    return errorResponse(e)
  }
}
