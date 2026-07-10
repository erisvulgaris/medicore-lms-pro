import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { ORDER_STATUS_FLOW } from "@/lib/constants"
import { randomToken } from "@/lib/format"

// Bulk-advance multiple orders to their next workflow state in a single call.
// Body: { orderIds: string[], targetStatus?: string }
// If targetStatus is provided, advance directly to that status (skipping intermediate
// states for the order, but still running all side-effects for each stage passed).
// This is the core of the "one-click workflow" for small labs.
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("orders.write")
    const body = await req.json()
    const { orderIds, targetStatus } = body as { orderIds: string[]; targetStatus?: string }

    if (!orderIds?.length) return errorResponse(new Error("No order IDs provided"))

    const orders = await db.testOrder.findMany({
      where: { id: { in: orderIds }, organizationId: user.organizationId },
      include: { orderTests: { include: { test: { select: { tatHours: true } } } }, samples: true },
    })

    const results: { id: string; orderCode: string; from: string; to: string; ok: boolean }[] = []

    for (const order of orders) {
      const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status as (typeof ORDER_STATUS_FLOW)[number])
      if (currentIdx < 0) {
        results.push({ id: order.id, orderCode: order.orderCode, from: order.status, to: order.status, ok: false })
        continue
      }

      let targetIdx: number
      if (targetStatus) {
        targetIdx = ORDER_STATUS_FLOW.indexOf(targetStatus as (typeof ORDER_STATUS_FLOW)[number])
        if (targetIdx <= currentIdx) {
          results.push({ id: order.id, orderCode: order.orderCode, from: order.status, to: order.status, ok: false })
          continue
        }
      } else {
        targetIdx = Math.min(currentIdx + 1, ORDER_STATUS_FLOW.length - 1)
      }

      const next = ORDER_STATUS_FLOW[targetIdx]

      // Check permission for approval step
      if (next === "APPROVED") {
        // require reports.approve — but for small-lab single-operator convenience,
        // ORG_OWNER / SUPER_ADMIN / BRANCH_ADMIN can approve inline.
        if (!["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "PATHOLOGIST"].includes(user.role)) {
          try { await requirePermission("reports.approve") } catch { 
            results.push({ id: order.id, orderCode: order.orderCode, from: order.status, to: order.status, ok: false })
            continue 
          }
        }
      }

      // Run all side-effects for each stage from currentIdx+1 to targetIdx
      for (let i = currentIdx + 1; i <= targetIdx; i++) {
        const stage = ORDER_STATUS_FLOW[i]
        if (stage === "COLLECTED") {
          await db.sample.updateMany({ where: { orderId: order.id }, data: { status: "RECEIVED", receivedAt: new Date() } })
        }
        if (stage === "PROCESSING") {
          await db.sample.updateMany({ where: { orderId: order.id, status: "RECEIVED" }, data: { status: "PROCESSING" } })
          await db.orderTest.updateMany({ where: { orderId: order.id }, data: { status: "PROCESSING" } })
        }
        if (stage === "COMPLETED") {
          await db.orderTest.updateMany({ where: { orderId: order.id, status: { in: ["PROCESSING", "PENDING"] } }, data: { status: "COMPLETED" } })
          await db.sample.updateMany({ where: { orderId: order.id, status: "PROCESSING" }, data: { status: "COMPLETED" } })
        }
        if (stage === "VERIFIED") {
          await db.orderTest.updateMany({ where: { orderId: order.id }, data: { status: "VERIFIED" } })
        }
        if (stage === "APPROVED") {
          await db.orderTest.updateMany({ where: { orderId: order.id }, data: { status: "APPROVED" } })
          await db.result.updateMany({ where: { orderTest: { orderId: order.id } }, data: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() } })
          // create/update report
          const rptCount = await db.report.count({ where: { organizationId: user.organizationId } })
          await db.report.upsert({
            where: { orderId: order.id },
            create: {
              organizationId: user.organizationId,
              orderId: order.id,
              reportCode: `RPT-${3001 + rptCount}`,
              status: "APPROVED",
              approvedById: user.id,
              approvedAt: new Date(),
              verificationToken: randomToken(12),
            },
            update: { status: "APPROVED", approvedById: user.id, approvedAt: new Date() },
          })
        }
      }

      await db.testOrder.update({
        where: { id: order.id },
        data: { status: next, approvedById: next === "APPROVED" ? user.id : order.approvedById },
      })

      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "BULK_ADVANCE", entity: "TestOrder", entityId: order.id, details: `${order.orderCode}: ${order.status} → ${next}` })
      results.push({ id: order.id, orderCode: order.orderCode, from: order.status, to: next, ok: true })
    }

    return Response.json({ results, advanced: results.filter((r) => r.ok).length, total: orderIds.length })
  } catch (e) {
    return errorResponse(e)
  }
}
