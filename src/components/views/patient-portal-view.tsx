"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, ClipboardList, Receipt, Calendar, Download, Share2, Phone, Mail, MapPin, Droplet, AlertTriangle, CheckCircle2, Clock, IndianRupee } from "lucide-react"
import { formatCurrency, formatDate, formatDateTime, initials, calcAge } from "@/lib/format"
import { ORDER_STATUS, INVOICE_STATUS, RESULT_FLAG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function PatientPortalView() {
  const { navigate } = useApp()
  const [patientId, setPatientId] = useState<string>("")
  const [tab, setTab] = useState("reports")

  // fetch patients for selector
  const { data: patientsData } = useQuery({
    queryKey: ["patients-portal"],
    queryFn: () => api.get<{ patients: any[] }>("/api/patients?limit=100"),
  })

  const { data, isLoading } = useQuery({
    queryKey: ["portal-patient", patientId],
    queryFn: () => api.get<any>(`/api/portal/patient${patientId ? `?patientId=${patientId}` : ""}`),
  })

  const shareReport = (token: string, code: string) => {
    const url = `${window.location.origin}/?verify=${token}`
    navigator.clipboard.writeText(url)
    toast.success(`Verification link for ${code} copied to clipboard`)
  }

  if (isLoading) return <PortalSkeleton />
  if (!data) return null

  const p = data.patient
  const s = data.summary

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Portal"
        subtitle="Self-service view: reports, invoices, history, and secure sharing"
        actions={
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select patient" /></SelectTrigger>
            <SelectContent>
              {(patientsData?.patients ?? []).map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>{pt.firstName} {pt.lastName} · {pt.patientCode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Patient header card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-20 w-20 border-4 border-background">
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initials(`${p.firstName} ${p.lastName}`)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{p.firstName} {p.lastName}</h2>
                <Badge variant="outline" className="font-mono text-xs">{p.patientCode}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.gender} · {p.age ?? calcAge(p.dob)} years · {p.bloodGroup || "—"}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoRow icon={Phone} label="Phone" value={p.phone || "—"} />
            <InfoRow icon={Mail} label="Email" value={p.email || "—"} />
            <InfoRow icon={MapPin} label="Address" value={[p.address, p.city].filter(Boolean).join(", ") || "—"} />
            <InfoRow icon={Droplet} label="Blood Group" value={p.bloodGroup || "—"} />
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Visits" value={s.totalOrders} icon={ClipboardList} accent="blue" sub={`since ${formatDate(p.createdAt)}`} />
        <StatCard label="Reports Ready" value={s.completedReports} icon={CheckCircle2} accent="emerald" sub={`${s.pendingReports} pending`} />
        <StatCard label="Total Billed" value={formatCurrency(s.totalBilled)} icon={IndianRupee} accent="violet" />
        <StatCard label="Outstanding" value={formatCurrency(s.outstanding)} icon={AlertTriangle} accent={s.outstanding > 0 ? "rose" : "emerald"} sub={s.outstanding > 0 ? "payment due" : "all settled"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Reports</TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Orders</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Invoices</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "reports" && (
        <div className="space-y-3">
          {p.orders.filter((o: any) => o.report).length === 0 ? (
            <EmptyState icon={FileText} title="No reports yet" description="Approved reports will appear here for download and sharing." />
          ) : (
            p.orders.filter((o: any) => o.report).map((o: any) => {
              const r = o.report
              const isReady = r.status === "APPROVED" || r.status === "DELIVERED"
              return (
                <Card key={o.id} className={cn("p-4", !isReady && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", isReady ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.reportCode}</p>
                        <Badge variant="outline" className={cn("text-[10px]", isReady ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400")}>{r.status}</Badge>
                        <span className="text-xs text-muted-foreground">{o.orderCode}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{o.orderTests.map((ot: any) => ot.test.shortName || ot.test.name).join(", ")}</p>
                      {r.approvedAt && <p className="mt-0.5 text-xs text-muted-foreground">Approved {formatDate(r.approvedAt)}</p>}
                    </div>
                    {isReady && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => navigate("report-detail", r.id)}><FileText className="mr-1.5 h-3.5 w-3.5" /> View</Button>
                        <Button variant="ghost" size="sm" onClick={() => shareReport(r.verificationToken, r.reportCode)}><Share2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                  {/* Results preview */}
                  {isReady && o.orderTests.some((ot: any) => ot.results.length > 0) && (
                    <div className="mt-3 grid gap-1.5 rounded-lg bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {o.orderTests.filter((ot: any) => ot.results.length > 0).map((ot: any) => {
                        const res = ot.results[0]
                        const flag = RESULT_FLAG[res.flag as keyof typeof RESULT_FLAG]
                        return (
                          <div key={ot.id} className="flex items-center justify-between text-xs">
                            <span className="truncate text-muted-foreground">{ot.test.shortName || ot.test.name}</span>
                            <span className="flex items-center gap-1.5">
                              <span className="font-medium">{res.value} {res.unit}</span>
                              {res.flag !== "NORMAL" && <span className={cn("rounded px-1 py-0.5 text-[9px] font-medium", flag?.badge)}>{flag?.label}</span>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {tab === "orders" && (
        <Card className="overflow-hidden">
          {p.orders.length === 0 ? <EmptyState icon={ClipboardList} title="No orders" /> : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y">
                {p.orders.map((o: any) => {
                  const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]
                  return (
                    <button key={o.id} onClick={() => navigate("order-detail", o.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", st?.color)}><ClipboardList className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{o.orderCode} {o.doctor && <span className="text-xs text-muted-foreground">· {o.doctor.name}</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{o.orderTests.map((ot: any) => ot.test.shortName || ot.test.name).join(", ")}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[10px]">{st?.label}</Badge>
                        <p className="mt-1 text-xs font-semibold">{formatCurrency(o.payableAmount)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}

      {tab === "invoices" && (
        <Card className="overflow-hidden">
          {p.invoices.length === 0 ? <EmptyState icon={Receipt} title="No invoices" /> : (
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y">
                {p.invoices.map((i: any) => {
                  const st = INVOICE_STATUS[i.status as keyof typeof INVOICE_STATUS]
                  return (
                    <button key={i.id} onClick={() => navigate("invoice-detail", i.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Receipt className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{i.invoiceCode}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(i.invoiceDate)}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", st?.color)}>{st?.label}</span>
                        <p className="mt-1 text-xs font-semibold">{formatCurrency(i.totalAmount)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function PortalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
    </div>
  )
}
