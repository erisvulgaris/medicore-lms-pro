import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { randomToken } from "@/lib/format"

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("orders.read")
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

    const where = {
      organizationId: user.organizationId,
      ...(status && status !== "ALL" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { orderCode: { contains: q } },
              { patient: { firstName: { contains: q } } },
              { patient: { lastName: { contains: q } } },
              { patient: { patientCode: { contains: q } } },
              { patient: { phone: { contains: q } } },
            ],
          }
        : {}),
    }
    const orders = await db.testOrder.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientCode: true, phone: true, gender: true, age: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        createdBy: { select: { name: true } },
        orderTests: { include: { test: { select: { id: true, name: true, shortName: true, code: true, unit: true, department: true } }, results: true } },
        samples: true,
        report: { select: { id: true, reportCode: true, status: true, verificationToken: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return Response.json({ orders })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("orders.write")
    const body = await req.json()
    const { patientId, doctorId, testIds, priority, isHomeCollection, notes, discountPercent } = body as {
      patientId: string
      doctorId?: string
      testIds: string[]
      priority?: string
      isHomeCollection?: boolean
      notes?: string
      discountPercent?: number
    }

    const tests = await db.test.findMany({ where: { id: { in: testIds }, organizationId: user.organizationId } })
    if (tests.length === 0) return errorResponse(new Error("No valid tests selected"))

    const subtotal = tests.reduce((s, t) => s + t.price, 0)
    const discount = discountPercent ? Math.round((subtotal * discountPercent) / 100) : 0
    const payable = subtotal - discount

    const count = await db.testOrder.count({ where: { organizationId: user.organizationId } })
    const orderCode = `ORD-${1001 + count}`

    const order = await db.testOrder.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        orderCode,
        patientId,
        doctorId: doctorId || null,
        createdById: user.id,
        status: "REGISTERED",
        priority: priority || "ROUTINE",
        isHomeCollection: isHomeCollection || false,
        notes,
        totalAmount: subtotal,
        discountAmount: discount,
        payableAmount: payable,
        reportDueAt: new Date(Date.now() + 24 * 3600000),
      },
    })

    // create order tests
    const orderTests = await Promise.all(
      tests.map((t) => db.orderTest.create({ data: { orderId: order.id, testId: t.id, price: t.price, status: "PENDING" } }))
    )

    // create a sample per unique sample type grouping (simplified: one sample)
    const sampleSeq = 5000 + (await db.sample.count({ where: { organizationId: user.organizationId } }))
    const sample = await db.sample.create({
      data: {
        organizationId: user.organizationId,
        orderId: order.id,
        sampleCode: `S-${sampleSeq}`,
        barcode: `BC${sampleSeq}${Date.now().toString(36).slice(-4)}`,
        sampleType: tests[0]?.sampleType || "Serum",
        tubeType: tests[0]?.tubeType || "SST",
        status: "COLLECTED",
        collectedById: user.id,
        collectorName: user.name,
      },
    })
    await db.orderTest.updateMany({ where: { id: { in: orderTests.map((ot) => ot.id) } }, data: { sampleId: sample.id } })

    // create invoice
    const invCount = await db.invoice.count({ where: { organizationId: user.organizationId } })
    const invoiceCode = `INV-${2001 + invCount}`
    const invoice = await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        branchId: user.branchId,
        invoiceCode,
        orderId: order.id,
        patientId,
        status: "UNPAID",
        subtotal,
        discountAmount: discount,
        discountPercent: discountPercent || 0,
        taxAmount: 0,
        totalAmount: payable,
        paidAmount: 0,
        balanceDue: payable,
        invoiceDate: new Date(),
      },
    })
    for (const t of tests) {
      await db.invoiceItem.create({ data: { invoiceId: invoice.id, description: t.name, testId: t.id, quantity: 1, rate: t.price, amount: t.price } })
    }

    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE", entity: "TestOrder", entityId: order.id, details: `Created order ${orderCode} with ${tests.length} tests` })
    return Response.json({ order, sample, invoice }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
