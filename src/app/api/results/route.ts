import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { evaluateFlag, type RefRange } from "@/lib/constants"
import { validateBody, resultCreateSchema } from "@/lib/validation"

// Save / update a result for an orderTest
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("results.write")
    const body = await validateBody(req, resultCreateSchema)
    const { orderTestId, value, unit, referenceRange, remarks } = body

    const ot = await db.orderTest.findUnique({
      where: { id: orderTestId },
      include: { test: true, order: { include: { patient: true } } },
    })
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

    const existing = await db.result.findFirst({ where: { orderTestId } })
    const result = existing
      ? await db.result.update({
          where: { id: existing.id },
          data: {
            value,
            unit: unit || ot.test.unit,
            flag,
            referenceRange: referenceRange || (ranges[0] ? `${ranges[0].low} - ${ranges[0].high}` : null),
            remarks,
            enteredById: user.id,
            enteredAt: new Date(),
            status: "ENTERED",
          },
        })
      : await db.result.create({
          data: {
            orderTestId,
            sampleId: ot.sampleId,
            value,
            unit: unit || ot.test.unit,
            flag,
            referenceRange: referenceRange || (ranges[0] ? `${ranges[0].low} - ${ranges[0].high}` : null),
            remarks,
            enteredById: user.id,
            status: "ENTERED",
          },
        })

    // mark orderTest as COMPLETED if result entered
    await db.orderTest.update({ where: { id: orderTestId }, data: { status: "COMPLETED" } })

    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "RESULT_ENTERED", entity: "Result", entityId: result.id, details: `${ot.test.shortName}: ${value} (${flag})` })
    return Response.json(result, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
