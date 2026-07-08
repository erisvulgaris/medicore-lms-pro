import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    if (!q.trim()) return Response.json({ results: [] })

    const [patients, orders, invoices, doctors, reports] = await Promise.all([
      db.patient.findMany({
        where: { organizationId: user.organizationId, OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { phone: { contains: q } }, { patientCode: { contains: q } }] },
        take: 8,
        select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true },
      }),
      db.testOrder.findMany({
        where: { organizationId: user.organizationId, OR: [{ orderCode: { contains: q } }, { patient: { patientCode: { contains: q } } }, { patient: { phone: { contains: q } } }] },
        take: 8,
        include: { patient: { select: { firstName: true, lastName: true, patientCode: true } } },
      }),
      db.invoice.findMany({
        where: { organizationId: user.organizationId, OR: [{ invoiceCode: { contains: q } }] },
        take: 8,
        include: { patient: { select: { firstName: true, lastName: true } } },
      }),
      db.doctor.findMany({ where: { organizationId: user.organizationId, OR: [{ name: { contains: q } }, { specialization: { contains: q } }] }, take: 5, select: { id: true, name: true, specialization: true } }),
      db.report.findMany({
        where: { organizationId: user.organizationId, OR: [{ reportCode: { contains: q } }, { order: { orderCode: { contains: q } } }] },
        take: 5,
        include: { order: { include: { patient: { select: { firstName: true, lastName: true } } } } },
      }),
    ])

    return Response.json({
      results: {
        patients: patients.map((p) => ({ id: p.id, type: "patient", title: `${p.firstName} ${p.lastName}`, subtitle: p.patientCode, meta: p.phone })),
        orders: orders.map((o) => ({ id: o.id, type: "order", title: o.orderCode, subtitle: `${o.patient.firstName} ${o.patient.lastName}`, meta: o.status })),
        invoices: invoices.map((i) => ({ id: i.id, type: "invoice", title: i.invoiceCode, subtitle: `${i.patient.firstName} ${i.patient.lastName}`, meta: `₹${i.totalAmount}` })),
        doctors: doctors.map((d) => ({ id: d.id, type: "doctor", title: d.name, subtitle: d.specialization, meta: "" })),
        reports: reports.map((r) => ({ id: r.id, type: "report", title: r.reportCode, subtitle: `${r.order.patient.firstName} ${r.order.patient.lastName}`, meta: r.status })),
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
