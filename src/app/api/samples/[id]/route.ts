import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("samples.write")
    const { id } = await params
    const body = await req.json()
    const { status, rejectionReason } = body
    const sample = await db.sample.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        receivedAt: status === "RECEIVED" ? new Date() : undefined,
      },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "SAMPLE_STATUS", entity: "Sample", entityId: id, details: `→ ${status}` })
    return Response.json(sample)
  } catch (e) {
    return errorResponse(e)
  }
}
