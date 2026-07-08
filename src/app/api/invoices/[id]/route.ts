import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("invoices.read")
    const { id } = await params
    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        patient: true,
        order: { include: { orderTests: { include: { test: { select: { name: true, shortName: true } } } } } },
        items: true,
        payments: { include: { receivedBy: { select: { name: true } } }, orderBy: { paidAt: "desc" } },
      },
    })
    if (!invoice) return errorResponse(new Error("NOT_FOUND"))
    const org = await db.organization.findUnique({ where: { id: user.organizationId } })
    return Response.json({ invoice, organization: org })
  } catch (e) {
    return errorResponse(e)
  }
}
