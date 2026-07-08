import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { randomToken } from "@/lib/format"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("reports.read")
    const { id } = await params
    const report = await db.report.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        order: {
          include: {
            patient: true,
            doctor: { select: { name: true, specialization: true } },
            orderTests: { include: { test: true, results: true } },
            branch: { select: { name: true, code: true, address: true, phone: true } },
          },
        },
        approvedBy: { select: { name: true } },
      },
    })
    if (!report) return errorResponse(new Error("NOT_FOUND"))
    const org = await db.organization.findUnique({ where: { id: user.organizationId } })
    const settings = await db.setting.findMany({ where: { organizationId: user.organizationId } })
    return Response.json({ report, organization: org, settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) })
  } catch (e) {
    return errorResponse(e)
  }
}

// Approve report
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("reports.approve")
    const { id } = await params
    const body = await req.json()
    const report = await db.report.update({
      where: { id },
      data: {
        status: body.status || "APPROVED",
        approvedById: user.id,
        approvedAt: new Date(),
        pathologistRemarks: body.remarks,
        verificationToken: body.ensureToken ? randomToken(12) : undefined,
      },
    })
    // also mark order as approved
    await db.testOrder.update({ where: { id: report.orderId }, data: { status: "APPROVED", approvedById: user.id } })
    await db.orderTest.updateMany({ where: { orderId: report.orderId }, data: { status: "APPROVED" } })
    await db.result.updateMany({ where: { orderTest: { orderId: report.orderId } }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "REPORT_APPROVED", entity: "Report", entityId: id, details: report.reportCode })
    return Response.json(report)
  } catch (e) {
    return errorResponse(e)
  }
}
