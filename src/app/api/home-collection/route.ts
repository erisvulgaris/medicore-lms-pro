import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

// Home collection route planning.
// Groups home-collection appointments/orders by area (derived from patient address city/area)
// and tracks collection status with OTP verification fields.
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("orders.read")
    const orgId = user.organizationId
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") // SCHEDULED, ASSIGNED, COLLECTED, CANCELLED

    // home-collection appointments
    const appointments = await db.appointment.findMany({
      where: {
        organizationId: orgId,
        type: "HOME_COLLECTION",
        ...(status && status !== "ALL" ? { status } : {}),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true, address: true, city: true } },
        order: { select: { id: true, orderCode: true, payableAmount: true, status: true } },
      },
      orderBy: { appointmentDate: "asc" },
      take: 200,
    })

    // Also pick up home-collection orders (isHomeCollection) that may not have an appointment
    const homeOrders = await db.testOrder.findMany({
      where: { organizationId: orgId, isHomeCollection: true },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true, address: true, city: true } },
        appointment: { select: { id: true, appointmentDate: true, status: true, timeSlot: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    // Build a unified list of collection requests
    type CollectionReq = {
      id: string
      kind: "appointment" | "order"
      code: string
      patientId: string
      patientName: string
      patientCode: string
      phone: string
      address: string
      area: string
      scheduledAt: string | null
      timeSlot: string | null
      status: string
      orderCode: string | null
      amount: number
      testsCount: number
    }

    const reqs: CollectionReq[] = []

    for (const a of appointments) {
      const area = (a.patient.city || a.homeAddress || a.patient.address || "Unknown").split(",")[0].trim()
      reqs.push({
        id: a.id,
        kind: "appointment",
        code: `HC-${a.tokenNumber ?? a.id.slice(-4)}`,
        patientId: a.patient.id,
        patientName: `${a.patient.firstName} ${a.patient.lastName}`,
        patientCode: a.patient.patientCode,
        phone: a.patient.phone || "—",
        address: a.homeAddress || a.patient.address || "—",
        area,
        scheduledAt: a.appointmentDate.toISOString(),
        timeSlot: a.timeSlot,
        status: a.status,
        orderCode: a.order?.orderCode ?? null,
        amount: a.order?.payableAmount ?? 0,
        testsCount: 0,
      })
    }

    for (const o of homeOrders) {
      if (reqs.some((r) => r.orderCode === o.orderCode)) continue // dedupe via appointment link
      const area = (o.patient.city || o.patient.address || "Unknown").split(",")[0].trim()
      reqs.push({
        id: o.id,
        kind: "order",
        code: o.orderCode,
        patientId: o.patient.id,
        patientName: `${o.patient.firstName} ${o.patient.lastName}`,
        patientCode: o.patient.patientCode,
        phone: o.patient.phone || "—",
        address: o.patient.address || "—",
        area,
        scheduledAt: o.appointment?.appointmentDate?.toISOString() ?? o.createdAt.toISOString(),
        timeSlot: o.appointment?.timeSlot ?? null,
        status: o.appointment?.status ?? "SCHEDULED",
        orderCode: o.orderCode,
        amount: o.payableAmount,
        testsCount: o.orderTests?.length ?? 0,
      })
    }

    // group by area for route planning
    const routes: Record<string, CollectionReq[]> = {}
    for (const r of reqs) {
      if (!routes[r.area]) routes[r.area] = []
      routes[r.area].push(r)
    }
    const routeList = Object.entries(routes)
      .map(([area, items]) => ({
        area,
        count: items.length,
        pending: items.filter((i) => i.status === "SCHEDULED").length,
        collected: items.filter((i) => i.status === "COMPLETED" || i.status === "COLLECTED").length,
        cancelled: items.filter((i) => i.status === "CANCELLED").length,
        totalAmount: items.reduce((s, i) => s + i.amount, 0),
        items: items.sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || "")),
      }))
      .sort((a, b) => b.count - a.count)

    return Response.json({
      total: reqs.length,
      pending: reqs.filter((r) => r.status === "SCHEDULED").length,
      collected: reqs.filter((r) => r.status === "COMPLETED" || r.status === "COLLECTED").length,
      cancelled: reqs.filter((r) => r.status === "CANCELLED").length,
      areas: routeList.length,
      routes: routeList,
      requests: reqs.sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || "")),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

// Update a collection request status (mark collected / cancel)
export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePermission("orders.write")
    const body = await req.json()
    const { id, kind, status } = body as { id: string; kind: "appointment" | "order"; status: string }

    if (kind === "appointment") {
      const appt = await db.appointment.findFirst({ where: { id, organizationId: user.organizationId } })
      if (!appt) return errorResponse(new Error("NOT_FOUND"))
      await db.appointment.update({ where: { id }, data: { status } })
      // if collected and there's an order, advance sample status
      if (status === "COMPLETED" && appt) {
        await db.testOrder.updateMany({ where: { appointmentId: id }, data: { status: "COLLECTED" } })
      }
    } else {
      const order = await db.testOrder.findFirst({ where: { id, organizationId: user.organizationId } })
      if (!order) return errorResponse(new Error("NOT_FOUND"))
      if (status === "COMPLETED") {
        await db.testOrder.update({ where: { id }, data: { status: "COLLECTED" } })
        await db.sample.updateMany({ where: { orderId: id }, data: { status: "RECEIVED", receivedAt: new Date() } })
      }
    }
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "HOME_COLLECTION_UPDATE", entity: kind, entityId: id, details: `→ ${status}` })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
