import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("appointments.read")
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    const status = searchParams.get("status")
    const where = {
      organizationId: user.organizationId,
      ...(date ? { appointmentDate: { gte: new Date(date + "T00:00:00"), lte: new Date(date + "T23:59:59") } } : {}),
      ...(status ? { status } : {}),
    }
    const appointments = await db.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
      orderBy: { appointmentDate: "desc" },
      take: 100,
    })
    return Response.json({ appointments })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("appointments.write")
    const body = await req.json()
    const count = await db.appointment.count({ where: { organizationId: user.organizationId } })
    const appointment = await db.appointment.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        patientId: body.patientId,
        doctorId: body.doctorId || null,
        appointmentDate: new Date(body.appointmentDate),
        timeSlot: body.timeSlot,
        type: body.type || "WALK_IN",
        status: "SCHEDULED",
        tokenNumber: count + 1,
        notes: body.notes,
        homeAddress: body.homeAddress,
      },
      include: { patient: { select: { firstName: true, lastName: true, patientCode: true } } },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE", entity: "Appointment", entityId: appointment.id, details: `Appointment for ${appointment.patient.firstName}` })
    return Response.json(appointment, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
