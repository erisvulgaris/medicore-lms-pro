import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const notifications = await db.notification.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return Response.json({ notifications })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const { id, read } = body
    if (id === "all") {
      await db.notification.updateMany({ where: { organizationId: user.organizationId, read: false }, data: { read: true } })
    } else {
      await db.notification.update({ where: { id }, data: { read } })
    }
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
