import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

// Express registration: create patient + test order + sample + invoice in ONE call.
// This is the "small lab" fast-path — a single form that does everything.
// Body: {
//   patient: { firstName, lastName, phone, gender, age?, dob?, email?, address?, bloodGroup? },
//   testIds: string[],
//   doctorId?: string,
//   priority?: string,
//   collectNow?: boolean,  // if true, mark sample as collected immediately
//   payNow?: boolean,      // if true, mark invoice as paid (cash)
//   paidAmount?: number,
// }
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("orders.write")
    const body = await req.json()
    const { patient: pData, testIds, doctorId, priority, collectNow, payNow, paidAmount } = body

    if (!pData?.firstName || !pData?.lastName) return errorResponse(new Error("Patient name required"))
    if (!testIds?.length) return errorResponse(new Error("At least one test required"))

    const tests = await db.test.findMany({ where: { id: { in: testIds }, organizationId: user.organizationId } })
    if (!tests.length) return errorResponse(new Error("No valid tests"))

    // 1. Create or find patient (by phone if provided)
    let patient = null
    if (pData.phone) {
      patient = await db.patient.findFirst({ where: { organizationId: user.organizationId, phone: pData.phone } })
    }
    if (!patient) {
      const pCount = await db.patient.count({ where: { organizationId: user.organizationId } })
      patient = await db.patient.create({
        data: {
          organizationId: user.organizationId,
          branchId: user.branchId,
          patientCode: `PT${String(pCount + 1).padStart(5, "0")}`,
          firstName: pData.firstName,
          lastName: pData.lastName,
          phone: pData.phone,
          email: pData.email,
          gender: pData.gender,
          age: pData.age ? Number(pData.age) : null,
          dob: pData.dob ? new Date(pData.dob) : null,
          address: pData.address,
          bloodGroup: pData.bloodGroup,
        },
      })
    }

    // 2. Create order
    const subtotal = tests.reduce((s, t) => s + t.price, 0)
    const oCount = await db.testOrder.count({ where: { organizationId: user.organizationId } })
    const orderCode = `ORD-${1001 + oCount}`
    const order = await db.testOrder.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        orderCode,
        patientId: patient.id,
        doctorId: doctorId || null,
        createdById: user.id,
        status: collectNow ? "COLLECTED" : "REGISTERED",
        priority: priority || "ROUTINE",
        totalAmount: subtotal,
        discountAmount: 0,
        payableAmount: subtotal,
        reportDueAt: new Date(Date.now() + 24 * 3600000),
      },
    })

    // 3. Create order tests
    const orderTests = await Promise.all(
      tests.map((t) => db.orderTest.create({ data: { orderId: order.id, testId: t.id, price: t.price, status: collectNow ? "PENDING" : "PENDING" } }))
    )

    // 4. Create sample (collected if collectNow)
    const sCount = await db.sample.count({ where: { organizationId: user.organizationId } })
    const sample = await db.sample.create({
      data: {
        organizationId: user.organizationId,
        orderId: order.id,
        sampleCode: `S-${5000 + sCount}`,
        barcode: `BC${5000 + sCount}${Date.now().toString(36).slice(-4)}`,
        sampleType: tests[0]?.sampleType || "Serum",
        tubeType: tests[0]?.tubeType || "SST",
        status: collectNow ? "RECEIVED" : "COLLECTED",
        receivedAt: collectNow ? new Date() : null,
        collectedById: user.id,
        collectorName: user.name,
      },
    })
    await db.orderTest.updateMany({ where: { id: { in: orderTests.map((ot) => ot.id) } }, data: { sampleId: sample.id } })

    // 5. Create invoice
    const iCount = await db.invoice.count({ where: { organizationId: user.organizationId } })
    const invoiceCode = `INV-${2001 + iCount}`
    const paid = payNow ? (paidAmount || subtotal) : 0
    const invoice = await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        invoiceCode,
        orderId: order.id,
        patientId: patient.id,
        status: paid >= subtotal ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
        subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
        paidAmount: paid,
        balanceDue: Math.max(0, subtotal - paid),
        invoiceDate: new Date(),
      },
    })
    for (const t of tests) {
      await db.invoiceItem.create({ data: { invoiceId: invoice.id, description: t.name, testId: t.id, quantity: 1, rate: t.price, amount: t.price } })
    }
    if (paid > 0) {
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          organizationId: user.organizationId,
          amount: paid,
          mode: "CASH",
          status: "SUCCESS",
          receivedById: user.id,
          paidAt: new Date(),
        },
      })
    }

    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "EXPRESS_REGISTER", entity: "TestOrder", entityId: order.id, details: `${orderCode} for ${patient.firstName} ${patient.lastName} (${tests.length} tests, ${paid > 0 ? "paid" : "unpaid"})` })

    return Response.json({
      patient: { id: patient.id, patientCode: patient.patientCode, name: `${patient.firstName} ${patient.lastName}` },
      order: { id: order.id, orderCode, status: order.status },
      sample: { id: sample.id, barcode: sample.barcode },
      invoice: { id: invoice.id, invoiceCode, status: invoice.status, total: subtotal, paid },
    }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
