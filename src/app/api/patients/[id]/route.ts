import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("patients.read")
    const { id } = await params
    const patient = await db.patient.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        orders: {
          include: { doctor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        invoices: { orderBy: { createdAt: "desc" }, take: 20 },
        appointments: { orderBy: { appointmentDate: "desc" }, take: 10 },
      },
    })
    if (!patient) return errorResponse(new Error("NOT_FOUND"))
    return Response.json(patient)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("patients.write")
    const { id } = await params
    const body = await req.json()
    const existing = await db.patient.findFirst({ where: { id, organizationId: user.organizationId } })
    if (!existing) return errorResponse(new Error("NOT_FOUND"))
    const patient = await db.patient.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        dob: body.dob ? new Date(body.dob) : null,
        age: body.age ? Number(body.age) : null,
        gender: body.gender,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
        state: body.state,
        bloodGroup: body.bloodGroup,
        emergencyContact: body.emergencyContact,
        medicalHistory: body.medicalHistory,
        allergies: body.allergies,
        gstin: body.gstin,
        isCorporate: body.isCorporate,
        corporateName: body.corporateName,
        insuranceProvider: body.insuranceProvider,
        insuranceId: body.insuranceId,
        notes: body.notes,
      },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "UPDATE", entity: "Patient", entityId: id, details: `Updated patient ${patient.patientCode}` })
    return Response.json(patient)
  } catch (e) {
    return errorResponse(e)
  }
}
