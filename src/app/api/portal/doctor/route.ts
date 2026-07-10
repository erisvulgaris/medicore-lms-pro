import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"

// Doctor portal: aggregates referred patients + reports for the current doctor.
// Resolves doctor by name match to the logged-in DOCTOR-role user, or by ?doctorId.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    let doctorId = searchParams.get("doctorId")

    if (!doctorId) {
      // try resolve by name match
      const d = await db.doctor.findFirst({ where: { organizationId: user.organizationId, name: user.name } })
      if (d) doctorId = d.id
    }
    if (!doctorId) {
      // fallback: first doctor for demo
      const d = await db.doctor.findFirst({ where: { organizationId: user.organizationId }, orderBy: { referralCount: "desc" } })
      if (d) doctorId = d.id
    }
    if (!doctorId) return errorResponse(new Error("NOT_FOUND"))

    const doctor = await db.doctor.findFirst({
      where: { id: doctorId, organizationId: user.organizationId },
    })
    if (!doctor) return errorResponse(new Error("NOT_FOUND"))

    const orders = await db.testOrder.findMany({
      where: { organizationId: user.organizationId, doctorId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, gender: true, age: true, phone: true } },
        orderTests: { include: { test: { select: { name: true, shortName: true, department: true } }, results: { select: { value: true, unit: true, flag: true, referenceRange: true } } } },
        report: { select: { id: true, reportCode: true, status: true, approvedAt: true, verificationToken: true, pathologistRemarks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const org = await db.organization.findUnique({ where: { id: user.organizationId }, select: { name: true, city: true, phone: true, address: true } })

    // summary
    const totalReferrals = orders.length
    const completedReports = orders.filter((o) => o.report && (o.report.status === "APPROVED" || o.report.status === "DELIVERED")).length
    const pendingReports = orders.filter((o) => !o.report || (o.report.status !== "APPROVED" && o.report.status !== "DELIVERED")).length
    const totalBilled = orders.reduce((s, o) => s + o.payableAmount, 0)
    const uniquePatients = new Set(orders.map((o) => o.patientId)).size

    // unique referred patients
    const patientsMap: Record<string, { patient: any; count: number; lastVisit: Date; totalBilled: number }> = {}
    for (const o of orders) {
      if (!patientsMap[o.patientId]) patientsMap[o.patientId] = { patient: o.patient, count: 0, lastVisit: o.createdAt, totalBilled: 0 }
      patientsMap[o.patientId].count++
      patientsMap[o.patientId].totalBilled += o.payableAmount
      if (o.createdAt > patientsMap[o.patientId].lastVisit) patientsMap[o.patientId].lastVisit = o.createdAt
    }
    const referredPatients = Object.values(patientsMap).sort((a, b) => b.count - a.count)

    return Response.json({
      doctor,
      organization: org,
      orders,
      referredPatients,
      summary: { totalReferrals, completedReports, pendingReports, totalBilled, uniquePatients },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
