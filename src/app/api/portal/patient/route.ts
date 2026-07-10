import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"

// Patient portal: aggregates the current user's patient record (matched by email/name)
// with their orders, reports, invoices, appointments. For demo, the DOCTOR-role or any
// user can view a patient portal by passing ?patientId=. If no patientId, we try to
// resolve a patient from the user's email.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    let patientId = searchParams.get("patientId")

    if (!patientId) {
      // try resolve by email
      const p = await db.patient.findFirst({ where: { organizationId: user.organizationId, email: user.email } })
      if (p) patientId = p.id
    }
    if (!patientId) {
      // fallback: first patient for demo
      const p = await db.patient.findFirst({ where: { organizationId: user.organizationId }, orderBy: { createdAt: "desc" } })
      if (p) patientId = p.id
    }
    if (!patientId) return errorResponse(new Error("NOT_FOUND"))

    const patient = await db.patient.findFirst({
      where: { id: patientId, organizationId: user.organizationId },
      include: {
        orders: {
          include: {
            doctor: { select: { name: true, specialization: true } },
            orderTests: { include: { test: { select: { name: true, shortName: true, department: true } }, results: { select: { value: true, unit: true, flag: true, referenceRange: true } } } },
            report: { select: { id: true, reportCode: true, status: true, approvedAt: true, verificationToken: true, pathologistRemarks: true } },
            invoice: { select: { id: true, invoiceCode: true, status: true, totalAmount: true, paidAmount: true, balanceDue: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        invoices: { orderBy: { createdAt: "desc" }, take: 20 },
        appointments: { include: { doctor: { select: { name: true } } }, orderBy: { appointmentDate: "desc" }, take: 10 },
      },
    })
    if (!patient) return errorResponse(new Error("NOT_FOUND"))

    const org = await db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true, city: true, phone: true, address: true, email: true } })

    // summary stats
    const totalOrders = patient.orders.length
    const completedReports = patient.orders.filter((o) => o.report && (o.report.status === "APPROVED" || o.report.status === "DELIVERED")).length
    const pendingReports = patient.orders.filter((o) => !o.report || (o.report.status !== "APPROVED" && o.report.status !== "DELIVERED")).length
    const totalBilled = patient.orders.reduce((s, o) => s + o.payableAmount, 0)
    const outstanding = patient.invoices.reduce((s, i) => s + i.balanceDue, 0)
    const lastVisit = patient.orders[0]?.createdAt ?? patient.createdAt

    return Response.json({
      patient,
      organization: org,
      summary: { totalOrders, completedReports, pendingReports, totalBilled, outstanding, lastVisit },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
