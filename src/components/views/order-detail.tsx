"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ArrowLeft, ClipboardList, TestTube2, QrCode, CheckCircle2, FileText, ArrowRight, AlertTriangle, Stethoscope, Home, User, ScanLine, X } from "lucide-react"
import { ORDER_STATUS, ORDER_STATUS_FLOW, SAMPLE_STATUS, RESULT_FLAG, PRIORITY } from "@/lib/constants"
import { formatCurrency, formatDateTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useState } from "react"

export function OrderDetail() {
  const { viewParam, navigate, can } = useApp()
  const id = viewParam!
  const qc = useQueryClient()
  const [remarks, setRemarks] = useState("")

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<any>(`/api/orders/${id}`),
  })

  const advance = useMutation({
    mutationFn: (payload?: any) => api.patch(`/api/orders/${id}`, { action: "advance_order", payload }),
    onSuccess: (data: any) => { toast.success(`Order moved to ${ORDER_STATUS[data.status as keyof typeof ORDER_STATUS]?.label}`); qc.invalidateQueries({ queryKey: ["order", id] }); qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  if (!order) return <EmptyState icon={AlertTriangle} title="Order not found" />

  const st = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]
  const pr = PRIORITY[order.priority as keyof typeof PRIORITY]
  const stepIdx = ORDER_STATUS_FLOW.indexOf(order.status as any)
  const canAdvance = order.status !== "ARCHIVED" && order.status !== "DELIVERED"
  const nextStatus = ORDER_STATUS_FLOW[stepIdx + 1]
  const nextLabel = ORDER_STATUS[nextStatus as keyof typeof ORDER_STATUS]?.label

  const allResultsEntered = order.orderTests.every((ot: any) => ot.results.length > 0)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("orders")} className="text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to orders
      </Button>

      {/* Header */}
      <PageHeader
        title={order.orderCode}
        subtitle={`${order.patient.firstName} ${order.patient.lastName} · ${order.patient.patientCode}`}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium", pr?.color)}>{pr?.label}</span>
            <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium text-white", st?.color)}>{st?.label}</span>
            {order.report && <Button variant="outline" size="sm" onClick={() => navigate("report-detail", order.report.id)}><FileText className="mr-1.5 h-3.5 w-3.5" /> View Report</Button>}
          </div>
        }
      />

      {/* Workflow stepper */}
      <Card className="p-5">
        <div className="flex items-center">
          {ORDER_STATUS_FLOW.map((s, i) => {
            const statusInfo = ORDER_STATUS[s as keyof typeof ORDER_STATUS]
            const done = i < stepIdx
            const current = i === stepIdx
            return (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all", done ? "bg-emerald-500 text-white" : current ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground")}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={cn("hidden text-[11px] font-medium sm:block", current ? "text-foreground" : "text-muted-foreground")}>{statusInfo.label}</span>
                </div>
                {i < ORDER_STATUS_FLOW.length - 1 && <div className={cn("mx-1 h-0.5 flex-1 rounded", i < stepIdx ? "bg-emerald-500" : "bg-border")} />}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Tests & results */}
          <SectionCard title="Tests & Results" description={`${order.orderTests.length} test(s) in this order`}>
            <div className="space-y-3">
              {order.orderTests.map((ot: any) => {
                const result = ot.results[0]
                const flag = result ? RESULT_FLAG[result.flag as keyof typeof RESULT_FLAG] : null
                const ranges = ot.test.referenceRanges ? JSON.parse(ot.test.referenceRanges) : []
                const refText = ranges[0] ? `${ranges[0].low} - ${ranges[0].high} ${ot.test.unit || ""}` : "—"
                return (
                  <div key={ot.id} className="rounded-lg border p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <TestTube2 className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{ot.test.name}</p>
                          <Badge variant="outline" className="font-mono text-[10px]">{ot.test.code}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{ot.test.department} · Ref: {refText} · TAT {ot.test.tatHours}h</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{ot.status}</Badge>
                    </div>
                    {result && (
                      <div className="mt-3 flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Result</p>
                          <p className="font-semibold">{result.value} <span className="text-xs font-normal text-muted-foreground">{result.unit}</span></p>
                        </div>
                        <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", flag?.badge)}>{flag?.label}</span>
                        <div className="ml-auto text-right">
                          <p className="text-[10px] text-muted-foreground">Entered by {result.enteredBy?.name || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(result.enteredAt)}</p>
                        </div>
                      </div>
                    )}
                    {result?.remarks && <p className="mt-2 text-xs italic text-muted-foreground">"{result.remarks}"</p>}
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Samples */}
          <SectionCard title="Sample Collection" description={`${order.samples.length} sample(s)`}>
            {order.samples.length === 0 ? <EmptyState icon={TestTube2} title="No samples" /> : (
              <div className="space-y-2">
                {order.samples.map((s: any) => {
                  const sst = SAMPLE_STATUS[s.status as keyof typeof SAMPLE_STATUS]
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <ScanLine className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{s.sampleCode} <span className="font-mono text-xs text-muted-foreground">{s.barcode}</span></p>
                        <p className="text-xs text-muted-foreground">{s.sampleType} · {s.tubeType} · Collected by {s.collectorName || s.collectedBy?.name || "—"}</p>
                      </div>
                      <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium text-white", sst?.color)}>{sst?.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Result entry */}
          {can("results.write") && order.status !== "DELIVERED" && order.status !== "ARCHIVED" && (
            <ResultEntry order={order} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Workflow actions */}
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Workflow Actions</h3>
            {canAdvance ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Current status</p>
                  <p className="font-semibold">{st?.label}</p>
                </div>
                {nextStatus === "APPROVED" && !allResultsEntered && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Not all test results have been entered. Approve anyway?
                  </div>
                )}
                {nextStatus === "APPROVED" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Pathologist remarks</label>
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Clinical correlation advised…" rows={2} />
                  </div>
                )}
                {can("orders.write") || (nextStatus === "APPROVED" && can("reports.approve")) ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" disabled={advance.isPending}>
                        Advance to {nextLabel} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Advance order status?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will move {order.orderCode} from <strong>{st?.label}</strong> to <strong>{nextLabel}</strong>. This action is audited.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => advance.mutate(nextStatus === "APPROVED" ? { remarks } : undefined)}>Confirm</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <p className="text-xs text-muted-foreground">You don't have permission to advance this order.</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
                <CheckCircle2 className="mx-auto mb-1 h-6 w-6 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Order {st?.label}</p>
              </div>
            )}
          </Card>

          {/* Patient info */}
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Patient</h3>
            <button onClick={() => navigate("patient-detail", order.patient.id)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials(`${order.patient.firstName} ${order.patient.lastName}`)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{order.patient.firstName} {order.patient.lastName}</p>
                <p className="truncate text-xs text-muted-foreground">{order.patient.patientCode} · {order.patient.gender} · {order.patient.age}y</p>
              </div>
            </button>
            {order.patient.phone && <InfoLine icon={User} value={order.patient.phone} />}
            {order.doctor && <InfoLine icon={Stethoscope} value={`${order.doctor.name} · ${order.doctor.specialization}`} />}
            {order.isHomeCollection && <InfoLine icon={Home} value="Home collection requested" />}
          </Card>

          {/* Billing */}
          {order.invoice && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Billing</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("invoice-detail", order.invoice.id)}>View</Button>
              </div>
              <div className="space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatCurrency(order.totalAmount)} />
                {order.discountAmount > 0 && <Row label="Discount" value={`-${formatCurrency(order.discountAmount)}`} />}
                <Separator className="my-2" />
                <Row label="Total" value={formatCurrency(order.payableAmount)} bold />
                <Row label="Paid" value={formatCurrency(order.invoice.paidAmount)} />
                <Row label="Balance" value={formatCurrency(order.invoice.balanceDue)} />
              </div>
            </Card>
          )}

          {/* Created by */}
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold">Metadata</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Created by {order.createdBy?.name}</p>
              <p>{formatDateTime(order.createdAt)}</p>
              {order.reportDueAt && <p>Report due: {formatDateTime(order.reportDueAt)}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ResultEntry({ order }: { order: any }) {
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, { value: string; remarks: string }>>({})
  const [saving, setSaving] = useState(false)

  const pendingTests = order.orderTests.filter((ot: any) => ot.results.length === 0 || ot.results[0]?.status === "ENTERED")

  const save = async (ot: any) => {
    const v = values[ot.id]
    if (!v?.value) { toast.error("Enter a value"); return }
    setSaving(true)
    try {
      await api.post("/api/results", { orderTestId: ot.id, value: v.value, remarks: v.remarks })
      toast.success(`Result saved for ${ot.test.shortName || ot.test.code}`)
      qc.invalidateQueries({ queryKey: ["order", order.id] })
      setValues((p) => ({ ...p, [ot.id]: { value: "", remarks: "" } }))
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (pendingTests.length === 0) return null

  return (
    <SectionCard title="Result Entry" description="Enter results for pending tests. Flags are auto-calculated from reference ranges.">
      <div className="space-y-3">
        {pendingTests.map((ot: any) => {
          const ranges = ot.test.referenceRanges ? JSON.parse(ot.test.referenceRanges) : []
          const refText = ranges[0] ? `${ranges[0].low} - ${ranges[0].high} ${ot.test.unit || ""}` : "—"
          return (
            <div key={ot.id} className="rounded-lg border p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">{ot.test.name} <span className="font-mono text-xs text-muted-foreground">{ot.test.code}</span></p>
                <span className="text-xs text-muted-foreground">Ref: {refText}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={ot.test.unit ? `Value (${ot.test.unit})` : "Value / Result"}
                  value={values[ot.id]?.value || ""}
                  onChange={(e) => setValues((p) => ({ ...p, [ot.id]: { ...p[ot.id], value: e.target.value, remarks: p[ot.id]?.remarks || "" } }))}
                  className="flex-1"
                />
                <Button size="sm" onClick={() => save(ot)} disabled={saving}>Save</Button>
              </div>
              <Input
                placeholder="Remarks (optional)"
                value={values[ot.id]?.remarks || ""}
                onChange={(e) => setValues((p) => ({ ...p, [ot.id]: { value: p[ot.id]?.value || "", remarks: e.target.value } }))}
                className="mt-2"
              />
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

function InfoLine({ icon: Icon, value }: { icon: any; value: string }) {
  return <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {value}</div>
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className={bold ? "font-semibold" : ""}>{value}</span></div>
}
