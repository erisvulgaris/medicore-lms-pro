import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { validateBody } from "@/lib/validation"
import { z } from "zod"
import { checkRateLimit } from "@/lib/rate-limit"

// Public patient self-registration (no auth required).
// Creates a patient in the first organization (for demo) + optionally creates an appointment.
const publicRegisterSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().min(7, "Valid phone is required").max(30),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  age: z.number().int().min(0).max(150).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  bloodGroup: z.string().max(10).optional(),
  testIds: z.array(z.string()).optional(), // optional: pre-select tests
  preferredDate: z.string().optional(), // optional appointment date
  notes: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 registrations per hour per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    if (!checkRateLimit(`register:${ip}`, 5, 3600)) {
      return Response.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 })
    }

    const body = await validateBody(req, publicRegisterSchema)

    // Use the first organization (for demo — production would use a subdomain or org code)
    const org = await db.organization.findFirst({ orderBy: { createdAt: "asc" } })
    if (!org) return errorResponse(new Error("NOT_FOUND"))

    const branch = await db.branch.findFirst({ where: { organizationId: org.id }, orderBy: { isHeadOffice: "desc" } })

    // Check for duplicate patient by phone
    const existing = await db.patient.findFirst({
      where: { organizationId: org.id, phone: body.phone },
    })
    if (existing) {
      return Response.json({
        error: "A patient with this phone number already exists. Please contact the lab to book an appointment.",
        existingPatientCode: existing.patientCode,
      }, { status: 409 })
    }

    const count = await db.patient.count({ where: { organizationId: org.id } })
    const patientCode = `PT${String(count + 1).padStart(5, "0")}`

    const patient = await db.patient.create({
      data: {
        organizationId: org.id,
        branchId: branch?.id || null,
        patientCode,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        email: body.email || null,
        gender: body.gender || null,
        age: body.age ?? null,
        address: body.address || null,
        city: body.city || null,
        bloodGroup: body.bloodGroup || null,
        notes: body.notes ? `Self-registered: ${body.notes}` : "Self-registered via public portal",
      },
    })

    // Optionally create an appointment if preferredDate is provided
    let appointment = null
    if (body.preferredDate) {
      const apptCount = await db.appointment.count({ where: { organizationId: org.id } })
      appointment = await db.appointment.create({
        data: {
          organizationId: org.id,
          branchId: branch?.id || null,
          patientId: patient.id,
          appointmentDate: new Date(body.preferredDate),
          type: "ONLINE",
          status: "SCHEDULED",
          tokenNumber: apptCount + 1,
          notes: body.testIds?.length ? `Requested tests: ${body.testIds.length}` : "Self-booked appointment",
        },
      })
    }

    await logAudit({
      organizationId: org.id,
      action: "PUBLIC_REGISTER",
      entity: "Patient",
      entityId: patient.id,
      details: `Self-registered patient ${patientCode} from ${ip}`,
      ipAddress: ip,
    })

    return Response.json({
      ok: true,
      patient: { patientCode, name: `${patient.firstName} ${patient.lastName}` },
      appointment: appointment ? { tokenNumber: appointment.tokenNumber, date: appointment.appointmentDate } : null,
      message: "Registration successful. Our team will contact you shortly to confirm your appointment.",
    }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
