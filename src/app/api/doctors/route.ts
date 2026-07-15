import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { validateBody, doctorCreateSchema } from "@/lib/validation"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("doctors.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const doctors = await db.doctor.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        ...(q ? { OR: [{ name: { contains: q } }, { specialization: { contains: q } }, { clinicName: { contains: q } }] } : {}),
      },
      orderBy: { name: "asc" },
    })
    // referral counts
    const withCounts = await Promise.all(
      doctors.map(async (d) => ({
        ...d,
        referralCount: await db.testOrder.count({ where: { organizationId: user.organizationId, doctorId: d.id } }),
      }))
    )
    return Response.json({ doctors: withCounts })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("doctors.write")
    const body = await validateBody(req, doctorCreateSchema)
    const doctor = await db.doctor.create({
      data: {
        organizationId: user.organizationId,
        name: body.name,
        specialization: body.specialization,
        qualifications: body.qualifications,
        phone: body.phone,
        email: body.email,
        clinicName: body.clinicName,
        clinicAddress: body.clinicAddress,
        commissionRate: Number(body.commissionRate) || 0,
        commissionEnabled: body.commissionEnabled || false,
      },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE", entity: "Doctor", entityId: doctor.id, details: `Added doctor ${doctor.name}` })
    return Response.json(doctor, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
