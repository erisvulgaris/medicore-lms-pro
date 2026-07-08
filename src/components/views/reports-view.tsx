"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Search, ClipboardCheck, CheckCircle2, Send, User, Stethoscope, TestTube2 } from "lucide-react"
import { formatDateTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type ReportStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "DELIVERED"

const REPORT_STATUS_STYLES: Record<ReportStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
  PENDING_APPROVAL: { label: "Pending Approval", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
}

interface ReportListItem {
  id: string
  reportCode: string
  status: ReportStatus
  approvedAt: string | null
  pathologistRemarks: string | null
  verificationToken: string
  order: {
    orderCode: string
    patient: { firstName: string; lastName: string; patientCode: string; gender: string | null; age: number | null }
    doctor: { name: string; specialization: string | null } | null
    orderTests: Array<{ test: { name: string; shortName: string | null }; results: Array<{ value: string; flag: string }> }>
  }
  approvedBy: { name: string } | null
}

export function ReportsView() {
  const { navigate } = useApp()
  const [q, setQ] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["reports", q],
    queryFn: () => api.get<{ reports: ReportListItem[] }>(`/api/reports?q=${encodeURIComponent(q)}`),
  })

  const reports = data?.reports ?? []

  const stats = useMemo(() => {
    const total = reports.length
    const pending = reports.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "DRAFT").length
    const approved = reports.filter((r) => r.status === "APPROVED").length
    const delivered = reports.filter((r) => r.status === "DELIVERED").length
    return { total, pending, approved, delivered }
  }, [reports])

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Generate, approve, and deliver patient reports" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Reports" value={stats.total} icon={FileText} accent="emerald" />
        <StatCard label="Pending Approval" value={stats.pending} icon={ClipboardCheck} accent="amber" />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Delivered" value={stats.delivered} icon={Send} accent="emerald" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by report code, order code, or patient…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports found"
            description="Reports are generated automatically when an order is approved. Try a different search."
          />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {reports.map((r) => {
                const status = REPORT_STATUS_STYLES[r.status] ?? REPORT_STATUS_STYLES.DRAFT
                const testsCount = r.order.orderTests.length
                const abnormalCount = r.order.orderTests.reduce(
                  (acc, ot) => acc + ot.results.filter((res) => res.flag && res.flag !== "NORMAL").length,
                  0,
                )
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate("report-detail", r.id)}
                    className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {r.order.patient.firstName} {r.order.patient.lastName}
                          </p>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {r.reportCode}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {r.order.orderCode}
                          </Badge>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", status.className)}>
                            {status.label}
                          </span>
                          {abnormalCount > 0 && (
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
                              {abnormalCount} abnormal
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <TestTube2 className="h-3 w-3" /> {testsCount} test{testsCount !== 1 ? "s" : ""}
                          </span>
                          {r.order.doctor && (
                            <span className="inline-flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" /> {r.order.doctor.name}
                            </span>
                          )}
                          {r.order.patient.gender && (
                            <span>
                              {r.order.patient.gender}
                              {r.order.patient.age != null ? ` · ${r.order.patient.age}y` : ""}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        {r.approvedBy ? (
                          <>
                            <p className="inline-flex items-center gap-1 text-xs font-medium">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {initials(r.approvedBy.name)} · {r.approvedBy.name.split(" ")[0]}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {r.approvedAt ? formatDateTime(r.approvedAt) : "—"}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not approved</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}
