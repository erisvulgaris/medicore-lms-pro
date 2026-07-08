import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("invoices.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const status = searchParams.get("status")
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        ...(status && status !== "ALL" ? { status } : {}),
        ...(q ? { OR: [{ invoiceCode: { contains: q } }, { patient: { firstName: { contains: q } } }, { patient: { lastName: { contains: q } } }, { patient: { patientCode: { contains: q } } }] } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true } },
        order: { select: { orderCode: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return Response.json({ invoices })
  } catch (e) {
    return errorResponse(e)
  }
}
