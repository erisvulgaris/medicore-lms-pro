import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, requireUser, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { ORDER_STATUS_FLOW } from "@/lib/constants"
import { randomToken } from "@/lib/format"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("orders.read")
    const { id } = await params
    const order = await db.testOrder.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true, specialization: true, phone: true } },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        orderTests: {
          include: {
            test: true,
            results: { include: { enteredBy: { select: { name: true } }, approvedBy: { select: { name: true } } } },
          },
        },
        samples: { include: { collectedBy: { select: { name: true } } } },
        report: true,
        invoice: { include: { items: true, payments: { include: { receivedBy: { select: { name: true } } } } } },
      },
    })
    if (!order) return errorResponse(new Error("NOT_FOUND"))
    return Response.json(order)
  } catch (e) {
    return errorResponse(e)
  }
}

// Advance order / orderTest / sample status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { action, payload } = body as { action: string; payload?: Record<string, unknown> }

    const order = await db.testOrder.findFirst({
      where: { id },
      include: { orderTests: true, samples: true },
    })
    if (!order) return errorResponse(new Error("NOT_FOUND"))

    const user = await requireUser()

    if (action === "advance_order") {
      if (!["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "RECEPTIONIST", "LAB_TECHNICIAN"].includes(user.role) && order.status === "VERIFIED") {
        // approval requires reports.approve
        await requirePermission("reports.approve")
      } else {
        await requirePermission("orders.write")
      }

      const idx = ORDER_STATUS_FLOW.indexOf(order.status as (typeof ORDER_STATUS_FLOW)[number])
      const next = ORDER_STATUS_FLOW[Math.min(idx + 1, ORDER_STATUS_FLOW.length - 1)]

      await db.testOrder.update({
        where: { id },
        data: { status: next, approvedById: next === "APPROVED" ? user.id : order.approvedById },
      })

      if (next === "COLLECTED") {
        await db.sample.updateMany({ where: { orderId: id }, data: { status: "RECEIVED", receivedAt: new Date() } })
      }
      if (next === "PROCESSING") {
        await db.sample.updateMany({ where: { orderId: id, status: "RECEIVED" }, data: { status: "PROCESSING" } })
        await db.orderTest.updateMany({ where: { orderId: id }, data: { status: "PROCESSING" } })
      }
      if (next === "COMPLETED") {
        await db.orderTest.updateMany({ where: { orderId: id, status: { in: ["PROCESSING", "PENDING"] } }, data: { status: "COMPLETED" } })
        await db.sample.updateMany({ where: { orderId: id, status: "PROCESSING" }, data: { status: "COMPLETED" } })
      }
      if (next === "VERIFIED") {
        await db.orderTest.updateMany({ where: { orderId: id }, data: { status: "VERIFIED" } })
      }
      if (next === "APPROVED") {
        await db.orderTest.updateMany({ where: { orderId: id }, data: { status: "APPROVED" } })
        await db.result.updateMany({ where: { orderTest: { orderId: id } }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } })
        const rptCount = await db.report.count({ where: { organizationId: user.organizationId } })
        await db.report.upsert({
          where: { orderId: id },
          create: {
            organizationId: user.organizationId,
            orderId: id,
            reportCode: `RPT-${3001 + rptCount}`,
            status: "APPROVED",
            approvedById: user.id,
            approvedAt: new Date(),
            pathologistRemarks: (payload?.remarks as string) || null,
            verificationToken: randomToken(12),
          },
          update: {
            status: "APPROVED",
            approvedById: user.id,
            approvedAt: new Date(),
            pathologistRemarks: (payload?.remarks as string) || null,
          },
        })
      }
      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "STATUS_CHANGE", entity: "TestOrder", entityId: id, details: `${order.orderCode}: ${order.status} → ${next}` })
      return Response.json({ status: next })
    }

    if (action === "reject_sample") {
      await requirePermission("samples.write")
      const sampleId = payload?.sampleId as string
      await db.sample.update({ where: { id: sampleId }, data: { status: "REJECTED", rejectionReason: payload?.reason as string } })
      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "REJECT_SAMPLE", entity: "Sample", entityId: sampleId, details: payload?.reason as string })
      return Response.json({ ok: true })
    }

    return errorResponse(new Error("Unknown action"))
  } catch (e) {
    return errorResponse(e)
  }
}
