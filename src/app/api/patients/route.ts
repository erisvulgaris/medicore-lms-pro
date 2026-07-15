import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { validateBody, patientCreateSchema } from "@/lib/validation"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("patients.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
    const offset = parseInt(searchParams.get("offset") || "0")

    const where = {
      organizationId: user.organizationId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { phone: { contains: q } },
              { email: { contains: q } },
              { patientCode: { contains: q } },
            ],
          }
        : {}),
    }
    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { _count: { select: { orders: true, invoices: true } } },
      }),
      db.patient.count({ where }),
    ])
    return Response.json({ patients, total })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("patients.write")
    const body = await validateBody(req, patientCreateSchema)
    const count = await db.patient.count({ where: { organizationId: user.organizationId } })
    const patientCode = `PT${String(count + 1).padStart(5, "0")}`
    const patient = await db.patient.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        patientCode,
        firstName: body.firstName,
        lastName: body.lastName,
        dob: body.dob ? new Date(body.dob) : null,
        age: body.age ?? null,
        gender: body.gender ?? null,
        phone: body.phone ?? null,
        email: body.email ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        bloodGroup: body.bloodGroup ?? null,
        emergencyContact: body.emergencyContact ?? null,
        medicalHistory: body.medicalHistory ?? null,
        allergies: body.allergies ?? null,
        gstin: body.gstin ?? null,
        isCorporate: body.isCorporate || false,
        corporateName: body.corporateName ?? null,
        insuranceProvider: body.insuranceProvider ?? null,
        insuranceId: body.insuranceId ?? null,
        notes: body.notes ?? null,
      },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE", entity: "Patient", entityId: patient.id, details: `Registered patient ${patientCode}` })
    return Response.json(patient, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
