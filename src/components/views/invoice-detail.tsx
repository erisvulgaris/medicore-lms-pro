"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  Printer,
  AlertTriangle,
  Loader2,
  Wallet,
  Receipt,
  User,
  IndianRupee,
  CreditCard,
  Banknote,
  CheckCircle2,
} from "lucide-react"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { INVOICE_STATUS, PAYMENT_MODES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type InvoiceStatus = keyof typeof INVOICE_STATUS

interface InvoiceDetailData {
  invoice: {
    id: string
    invoiceCode: string
    status: InvoiceStatus
    subtotal: number
    discountAmount: number
    discountPercent: number
    taxAmount: number
    roundOff: number
    totalAmount: number
    paidAmount: number
    balanceDue: number
    invoiceDate: string
    dueDate: string | null
    notes: string | null
    patient: {
      firstName: string
      lastName: string
      patientCode: string
      phone: string | null
      email: string | null
      address: string | null
      city: string | null
      state: string | null
      gstin: string | null
    }
    order: {
      orderCode: string
      orderTests: Array<{ test: { name: string; shortName: string | null } }>
    } | null
    items: Array<{
      id: string
      description: string
      quantity: number
      rate: number
      amount: number
    }>
    payments: Array<{
      id: string
      amount: number
      mode: string
      reference: string | null
      remarks: string | null
      status: string
      paidAt: string
      receivedBy: { name: string } | null
    }>
  }
  organization: {
    name: string
    legalName: string | null
    address: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    phone: string | null
    email: string | null
    gstin: string | null
  } | null
}

export function InvoiceDetail() {
  const { viewParam, navigate, can } = useApp()
  const id = viewParam!

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.get<InvoiceDetailData>(`/api/invoices/${id}`),
  })

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  if (!data) return <EmptyState icon={AlertTriangle} title="Invoice not found" />

  const { invoice, organization } = data
  const st = INVOICE_STATUS[invoice.status]

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceCode}
        subtitle={`Issued ${formatDate(invoice.invoiceDate)} · ${invoice.patient.firstName} ${invoice.patient.lastName}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("invoices")} className="text-muted-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Print
            </Button>
            <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium", st?.color)}>{st?.label}</span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice document */}
        <div className="lg:col-span-2">
          <div className="mx-auto max-w-[820px]">
            <div className="rounded-xl bg-white text-black shadow-sm ring-1 ring-border/60">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold leading-tight text-slate-900">
                      {organization?.legalName || organization?.name || "Pathology Laboratory"}
                    </h1>
                    {organization?.address && <p className="mt-0.5 text-xs text-slate-600">{organization.address}</p>}
                    <p className="text-xs text-slate-600">
                      {[organization?.city, organization?.state, organization?.postalCode].filter(Boolean).join(", ")}
                    </p>
                    {organization?.phone && <p className="text-xs text-slate-600">Phone: {organization.phone}</p>}
                    {organization?.gstin && <p className="text-xs text-slate-600">GSTIN: {organization.gstin}</p>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Invoice</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{invoice.invoiceCode}</p>
                  <p className="mt-0.5 text-xs text-slate-600">Date: {formatDate(invoice.invoiceDate)}</p>
                  {invoice.dueDate && <p className="text-xs text-slate-600">Due: {formatDate(invoice.dueDate)}</p>}
                  <span className={cn("mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-medium", st?.color)}>
                    {st?.label}
                  </span>
                </div>
              </div>

              {/* Bill to */}
              <div className="border-b border-slate-200 p-6 sm:p-8">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Bill To</p>
                <p className="font-semibold text-slate-900">
                  {invoice.patient.firstName} {invoice.patient.lastName}
                </p>
                <p className="text-xs text-slate-600">
                  Code: <span className="font-mono">{invoice.patient.patientCode}</span>
                  {invoice.order && <> · Order: <span className="font-mono">{invoice.order.orderCode}</span></>}
                </p>
                {invoice.patient.address && <p className="text-xs text-slate-600">{invoice.patient.address}</p>}
                <p className="text-xs text-slate-600">
                  {[invoice.patient.city, invoice.patient.state].filter(Boolean).join(", ")}
                </p>
                {invoice.patient.phone && <p className="text-xs text-slate-600">Phone: {invoice.patient.phone}</p>}
                {invoice.patient.gstin && <p className="text-xs text-slate-600">GSTIN: {invoice.patient.gstin}</p>}
              </div>

              {/* Items */}
              <div className="p-6 sm:p-8">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{it.description}</td>
                          <td className="px-3 py-2.5 text-center text-slate-700">{it.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(it.rate)}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatCurrency(it.amount)}</td>
                        </tr>
                      ))}
                      {invoice.items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-xs text-slate-400">
                            No line items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5 text-sm">
                    <TotalRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
                    {invoice.discountAmount > 0 && (
                      <TotalRow
                        label={`Discount${invoice.discountPercent > 0 ? ` (${invoice.discountPercent}%)` : ""}`}
                        value={`-${formatCurrency(invoice.discountAmount)}`}
                      />
                    )}
                    {invoice.taxAmount > 0 && <TotalRow label="Tax" value={formatCurrency(invoice.taxAmount)} />}
                    {Math.abs(invoice.roundOff) > 0 && <TotalRow label="Round Off" value={formatCurrency(invoice.roundOff)} />}
                    <Separator className="my-1.5 bg-slate-200" />
                    <TotalRow label="Total" value={formatCurrency(invoice.totalAmount)} bold />
                    <TotalRow label="Paid" value={formatCurrency(invoice.paidAmount)} className="text-emerald-700" />
                    <Separator className="my-1.5 bg-slate-200" />
                    <div className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2 text-white">
                      <span className="text-xs font-medium uppercase tracking-wider">Balance Due</span>
                      <span className="text-base font-bold">{formatCurrency(invoice.balanceDue)}</span>
                    </div>
                  </div>
                </div>

                {invoice.notes && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</p>
                    <p className="mt-0.5 text-xs text-slate-700">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {can("payments.receive") && invoice.balanceDue > 0 && invoice.status !== "CANCELLED" && invoice.status !== "REFUNDED" && (
            <RecordPaymentCard invoiceId={invoice.id} balanceDue={invoice.balanceDue} />
          )}

          {/* Payments history */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Payment History</h3>
              <Badge variant="outline" className="text-[10px]">{invoice.payments.length}</Badge>
            </div>
            {invoice.payments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments yet" description="Record a payment to begin." />
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-2 pr-1">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                          <p className="text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CreditCard className="h-3 w-3" /> {p.mode}
                            </span>
                            {p.reference && <span className="ml-1 font-mono">· {p.reference}</span>}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px]", p.status === "SUCCESS" ? "border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400" : "text-muted-foreground")}>
                          {p.status}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {p.receivedBy?.name || "—"}
                        </span>
                        <span>{formatDateTime(p.paidAt)}</span>
                      </div>
                      {p.remarks && <p className="mt-1 text-[11px] italic text-muted-foreground">"{p.remarks}"</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>

          {/* Summary */}
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Summary</h3>
            <div className="space-y-1.5 text-sm">
              <Row label="Invoice Total" value={formatCurrency(invoice.totalAmount)} />
              <Row label="Collected" value={formatCurrency(invoice.paidAmount)} className="text-emerald-600 dark:text-emerald-400" />
              <Row label="Balance" value={formatCurrency(invoice.balanceDue)} bold />
              <Separator className="my-2" />
              <Row label="Status" value={<span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", st?.color)}>{st?.label}</span>} />
              <Row label="Issued" value={formatDate(invoice.invoiceDate)} />
              {invoice.dueDate && <Row label="Due" value={formatDate(invoice.dueDate)} />}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RecordPaymentCard({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: number }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(String(balanceDue))
  const [mode, setMode] = useState<string>("CASH")
  const [reference, setReference] = useState("")
  const [remarks, setRemarks] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (amt > balanceDue) {
      toast.warning("Amount exceeds balance due — recording anyway")
    }
    setSaving(true)
    try {
      await api.post("/api/payments", { invoiceId, amount: amt, mode, reference: reference || undefined, remarks: remarks || undefined })
      toast.success("Payment recorded")
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
      setReference("")
      setRemarks("")
      setAmount(String(Math.max(0, balanceDue - amt)))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Banknote className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold leading-tight">Record Payment</h3>
          <p className="text-[11px] text-muted-foreground">Balance: {formatCurrency(balanceDue)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mode</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m} className="font-medium">
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Reference (optional)</Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="UTR / Cheque no / Txn ID"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Remarks (optional)</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Advance / partial settlement…" />
        </div>
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Record Payment
        </Button>
      </div>
    </Card>
  )
}

function TotalRow({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-slate-600", bold && "font-semibold text-slate-900")}>{label}</span>
      <span className={cn("text-slate-900", bold && "text-base font-bold", className)}>{value}</span>
    </div>
  )
}

function Row({ label, value, bold, className }: { label: string; value: React.ReactNode; bold?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && "font-semibold", className)}>{value}</span>
    </div>
  )
}
