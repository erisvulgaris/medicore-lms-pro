import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { evaluateFlag, type RefRange } from "@/lib/constants"

// Quick result entry: save a result for an orderTest by test code + order code,
// or by orderTestId directly. Designed for inline one-screen result entry.
// Body: { orderTestId, value, remarks? } OR { orderId, testCode, value, remarks? }
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("results.write")
    const body = await req.json()
    const { orderTestId, orderId, testCode, value, remarks } = body

    let ot = null
    if (orderTestId) {
      ot = await db.orderTest.findUnique({ where: { id: orderTestId }, include: { test: true, order: { include: { patient: true } } } })
    } else if (orderId && testCode) {
      ot = await db.orderTest.findFirst({
        where: { orderId, test: { code: testCode } },
        include: { test: true, order: { include: { patient: true } } },
      })
    }
    if (!ot) return errorResponse(new Error("NOT_FOUND"))

    // evaluate flag
    let flag = "NORMAL"
    const ranges: RefRange[] = ot.test.referenceRanges ? JSON.parse(ot.test.referenceRanges) : []
    const numeric = parseFloat(value)
    if (!isNaN(numeric) && ranges.length > 0) {
      flag = evaluateFlag(numeric, ranges, ot.order.patient.gender, ot.order.patient.age)
    } else if (value && /high|elevated|positive|abnormal|present/i.test(value)) {
      flag = "ABNORMAL"
    }

    const existing = await db.result.findFirst({ where: { orderTestId: ot.id } })
    const refText = ranges[0] ? `${ranges[0].low} - ${ranges[0].high}` : null
    const result = existing
      ? await db.result.update({
          where: { id: existing.id },
          data: { value, unit: ot.test.unit, flag, referenceRange: refText, remarks, enteredById: user.id, enteredAt: new Date(), status: "ENTERED" },
        })
      : await db.result.create({
          data: { orderTestId: ot.id, sampleId: ot.sampleId, value, unit: ot.test.unit, flag, referenceRange: refText, remarks, enteredById: user.id, status: "ENTERED" },
        })

    // mark orderTest as COMPLETED
    await db.orderTest.update({ where: { id: ot.id }, data: { status: "COMPLETED" } })

    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "QUICK_RESULT", entity: "Result", entityId: result.id, details: `${ot.test.shortName}: ${value} (${flag})` })
    return Response.json({ result, flag, orderTestId: ot.id, testCode: ot.test.code }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
