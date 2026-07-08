import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("payments.receive")
    const body = await req.json()
    const { invoiceId, amount, mode, reference, remarks } = body
    const invoice = await db.invoice.findFirst({ where: { id: invoiceId, organizationId: user.organizationId } })
    if (!invoice) return errorResponse(new Error("NOT_FOUND"))
    const payment = await db.payment.create({
      data: {
        invoiceId,
        organizationId: user.organizationId,
        amount: Number(amount),
        mode,
        reference,
        status: "SUCCESS",
        receivedById: user.id,
        remarks,
      },
    })
    const newPaid = invoice.paidAmount + Number(amount)
    const newBalance = invoice.totalAmount - newPaid
    const newStatus = newBalance <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : invoice.status
    await db.invoice.update({ where: { id: invoiceId }, data: { paidAmount: newPaid, balanceDue: Math.max(0, newBalance), status: newStatus } })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "PAYMENT", entity: "Invoice", entityId: invoiceId, details: `${mode} ₹${amount} for ${invoice.invoiceCode}` })
    return Response.json({ payment, invoice: { paidAmount: newPaid, balanceDue: Math.max(0, newBalance), status: newStatus } }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
