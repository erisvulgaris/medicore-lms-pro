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
import { Stethoscope, Users, FileText, CheckCircle2, Clock, IndianRupee, Share2, Phone, Activity, TrendingUp } from "lucide-react"
import { formatCurrency, formatDate, formatDateTime, initials } from "@/lib/format"
import { ORDER_STATUS, RESULT_FLAG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function DoctorPortalView() {
  const { navigate } = useApp()
  const [doctorId, setDoctorId] = useState<string>("")
  const [tab, setTab] = useState("patients")

  const { data: doctorsData } = useQuery({
    queryKey: ["doctors-portal"],
    queryFn: () => api.get<{ doctors: any[] }>("/api/doctors"),
  })

  const { data, isLoading } = useQuery({
    queryKey: ["portal-doctor", doctorId],
    queryFn: () => api.get<any>(`/api/portal/doctor${doctorId ? `?doctorId=${doctorId}` : ""}`),
  })

  if (isLoading) return <DoctorPortalSkeleton />
  if (!data) return null

  const d = data.doctor
  const s = data.summary

  const shareReport = (token: string, code: string) => {
    const url = `${window.location.origin}/?verify=${token}`
    navigator.clipboard.writeText(url)
    toast.success(`Verification link for ${code} copied`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Portal"
        subtitle="Referring physician view: patients, reports, and referral analytics"
        actions={
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select doctor" /></SelectTrigger>
            <SelectContent>
              {(doctorsData?.doctors ?? []).map((dr) => (
                <SelectItem key={dr.id} value={dr.id}>{dr.name} · {dr.specialization}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Doctor header card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-violet-500/15 via-violet-500/5 to-transparent" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-20 w-20 border-4 border-background">
              <AvatarFallback className="bg-violet-500 text-lg font-semibold text-white">{initials(d.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{d.name}</h2>
                <Badge variant="secondary" className="gap-1"><Stethoscope className="h-3 w-3" /> {d.specialization || "General"}</Badge>
                {d.commissionEnabled && <Badge variant="outline" className="text-[10px]">Commission: {d.commissionRate}%</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{d.clinicName || "—"} · {d.phone || "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Referrals" value={s.totalReferrals} icon={Users} accent="violet" />
        <StatCard label="Unique Patients" value={s.uniquePatients} icon={Users} accent="blue" />
        <StatCard label="Reports Ready" value={s.completedReports} icon={CheckCircle2} accent="emerald" sub={`${s.pendingReports} pending`} />
        <StatCard label="Revenue Generated" value={formatCurrency(s.totalBilled)} icon={IndianRupee} accent="emerald" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="patients" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Referred Patients</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Reports</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "patients" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.referredPatients.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3"><EmptyState icon={Users} title="No referred patients" /></div>
          ) : (
            data.referredPatients.map((rp: any, i: number) => (
              <Card key={rp.patient.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials(`${rp.patient.firstName} ${rp.patient.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate("patient-detail", rp.patient.id)} className="block truncate text-left text-sm font-medium hover:underline">{rp.patient.firstName} {rp.patient.lastName}</button>
                    <p className="truncate text-xs text-muted-foreground">{rp.patient.patientCode} · {rp.patient.gender} · {rp.patient.age}y</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{rp.count} referral{rp.count > 1 ? "s" : ""}</span>
                  <span className="font-semibold">{formatCurrency(rp.totalBilled)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last: {formatDate(rp.lastVisit)}</span>
                  {rp.patient.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {rp.patient.phone}</span>}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          {data.orders.filter((o: any) => o.report).length === 0 ? (
            <EmptyState icon={FileText} title="No reports yet" description="Approved reports for your referred patients will appear here." />
          ) : (
            data.orders.filter((o: any) => o.report).map((o: any) => {
              const r = o.report
              const isReady = r.status === "APPROVED" || r.status === "DELIVERED"
              return (
                <Card key={o.id} className={cn("p-4", !isReady && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", isReady ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.reportCode}</p>
                        <Badge variant="outline" className={cn("text-[10px]", isReady ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400")}>{r.status}</Badge>
                        <span className="text-xs text-muted-foreground">{o.orderCode}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{o.patient.firstName} {o.patient.lastName} · {o.patient.patientCode}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.orderTests.map((ot: any) => ot.test.shortName || ot.test.name).join(", ")}</p>
                      {r.approvedAt && <p className="mt-0.5 text-xs text-muted-foreground">Approved {formatDate(r.approvedAt)}</p>}
                    </div>
                    {isReady && (
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => navigate("report-detail", r.id)}><FileText className="mr-1.5 h-3.5 w-3.5" /> View</Button>
                        <Button variant="ghost" size="sm" onClick={() => shareReport(r.verificationToken, r.reportCode)}><Share2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                  {/* Results preview with flags */}
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
    </div>
  )
}

function DoctorPortalSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
    </div>
  )
}
