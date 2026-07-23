import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

// PATCH /api/marketplace/reviews/[id] — moderate review (verify/report/unreport)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("settings.manage")
    const { id } = await params
    const body = await req.json()
    const { action } = body as { action: "verify" | "report" | "unreport" | "delete" }

    const review = await db.labReview.findUnique({ where: { id } })
    if (!review) return errorResponse(new Error("NOT_FOUND"))

    if (action === "delete") {
      await db.labReview.delete({ where: { id } })
      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "DELETE_REVIEW", entity: "LabReview", entityId: id, details: `Deleted review by ${review.patientName}` })
      return Response.json({ ok: true })
    }

    const data: any = {}
    if (action === "verify") data.verified = true
    if (action === "report") data.reported = true
    if (action === "unreport") data.reported = false

    const updated = await db.labReview.update({ where: { id }, data })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: `REVIEW_${action.toUpperCase()}`, entity: "LabReview", entityId: id, details: `Review by ${review.patientName}` })
    return Response.json({ review: updated })
  } catch (e) {
    return errorResponse(e)
  }
}
