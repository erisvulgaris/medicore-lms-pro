"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Gauge, Clock, AlertTriangle, CheckCircle2, TimerReset, FlaskConical, Download, TrendingDown } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatDateTime, formatDate } from "@/lib/format"
import { downloadCSV, csvDate } from "@/lib/csv"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const SAMPLE_STATUS_COLOR: Record<string, string> = {
  COLLECTED: "bg-amber-500",
  RECEIVED: "bg-blue-500",
  PROCESSING: "bg-violet-500",
}
const AGING_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]

export function AnalyticsView() {
  const [tab, setTab] = useState("tat")
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-tat"],
    queryFn: () => api.get<any>("/api/analytics/tat"),
  })

  if (isLoading) return <AnalyticsSkeleton />
  if (!data) return null

  const tat = data.tat
  const aging = data.sampleAging

  const exportSamples = () => {
    if (!aging.samples.length) { toast.info("No samples to export"); return }
    downloadCSV(`sample-aging-${new Date().toISOString().slice(0, 10)}`, aging.samples, [
      { key: "barcode", label: "Barcode" },
      { key: "sampleCode", label: "Sample Code" },
      { key: "patient", label: "Patient" },
      { key: "patientCode", label: "Patient Code" },
      { key: "orderCode", label: "Order" },
      { key: "tests", label: "Tests" },
      { key: "status", label: "Status" },
      { key: "ageHours", label: "Age (hrs)" },
      { key: "expectedTat", label: "Expected TAT (hrs)" },
      { key: "remainingHours", label: "Remaining (hrs)" },
      { key: "overdue", label: "Overdue" },
      { key: "_collected", label: "Collected At" },
    ].map(c => c.key === "_collected" ? { key: "_collected", label: "Collected At" } : c), )
    // simpler: build rows with collectedAt formatted
    const rows = aging.samples.map((s: any) => ({
      ...s,
      collectedAt: csvDate(s.collectedAt),
      overdue: s.overdue ? "YES" : "NO",
    }))
    downloadCSV(`sample-aging-${new Date().toISOString().slice(0, 10)}`, rows, [
      { key: "barcode", label: "Barcode" },
      { key: "sampleCode", label: "Sample Code" },
      { key: "patient", label: "Patient" },
      { key: "patientCode", label: "Patient Code" },
      { key: "orderCode", label: "Order" },
      { key: "tests", label: "Tests" },
      { key: "status", label: "Status" },
      { key: "ageHours", label: "Age (hrs)" },
      { key: "expectedTat", label: "Expected TAT (hrs)" },
      { key: "remainingHours", label: "Remaining (hrs)" },
      { key: "overdue", label: "Overdue" },
      { key: "collectedAt", label: "Collected At" },
    ])
    toast.success("Sample aging exported to CSV")
  }

  const exportTat = () => {
    if (!tat.perTest.length) { toast.info("No TAT data to export"); return }
    const rows = tat.perTest.map((t: any) => ({ ...t, compliancePct: t.compliance }))
    downloadCSV(`tat-compliance-${new Date().toISOString().slice(0, 10)}`, rows, [
      { key: "name", label: "Test" },
      { key: "total", label: "Total Orders" },
      { key: "compliant", label: "Compliant" },
      { key: "compliancePct", label: "Compliance %" },
      { key: "avgActual", label: "Avg Actual (hrs)" },
    ])
    toast.success("TAT compliance exported to CSV")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Analytics"
        subtitle="TAT compliance and sample aging — operational efficiency metrics"
        actions={
          tab === "tat" ? (
            <Button variant="outline" onClick={exportTat}><Download className="mr-2 h-4 w-4" /> Export TAT</Button>
          ) : (
            <Button variant="outline" onClick={exportSamples}><Download className="mr-2 h-4 w-4" /> Export Samples</Button>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tat" className="gap-1.5"><Gauge className="h-3.5 w-3.5" /> TAT Compliance</TabsTrigger>
          <TabsTrigger value="aging" className="gap-1.5"><TimerReset className="h-3.5 w-3.5" /> Sample Aging</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "tat" ? (
        <div className="space-y-6">
          {/* TAT stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Compliance Rate" value={`${tat.complianceRate}%`} icon={CheckCircle2} accent={tat.complianceRate >= 80 ? "emerald" : tat.complianceRate >= 60 ? "amber" : "rose"} sub={`${tat.compliant} of ${tat.total} on time`} />
            <StatCard label="TAT Breached" value={tat.breached} icon={TrendingDown} accent="rose" sub="exceeded expected turnaround" />
            <StatCard label="On Time" value={tat.compliant} icon={CheckCircle2} accent="emerald" sub={`within expected TAT`} />
            <StatCard label="Pending Measurement" value={tat.pending} icon={Clock} accent="amber" sub="completed, awaiting approval" />
          </div>

          {/* Compliance gauge + trend */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6">
              <h3 className="mb-3 self-start font-semibold">Overall Compliance</h3>
              <ComplianceGauge value={tat.complianceRate} />
              <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-emerald-600">{tat.buckets.onTime}</p>
                  <p className="text-[11px] text-muted-foreground">On time</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-amber-600">{tat.buckets.slight}</p>
                  <p className="text-[11px] text-muted-foreground">Slight (≤150%)</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-rose-600">{tat.buckets.overdue}</p>
                  <p className="text-[11px] text-muted-foreground">Overdue</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h3 className="mb-1 font-semibold">TAT Compliance Trend</h3>
              <p className="mb-4 text-sm text-muted-foreground">% of orders completed within TAT — last 14 days</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={tat.trend} margin={{ left: -10, right: 10, top: 5 }}>
                  <defs>
                    <linearGradient id="tatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Compliance"]} labelFormatter={(v) => formatDate(v)} />
                  <Area type="monotone" dataKey="compliance" stroke="#10b981" strokeWidth={2.5} fill="url(#tatGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Per-test compliance */}
          <SectionCard title="TAT by Test" description="Compliance breakdown per test type">
            {tat.perTest.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No TAT data" description="Completed orders with approved reports will appear here." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tat.perTest} margin={{ left: 10, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: any) => [`${v}%`, "Compliance"]} />
                    <Bar dataKey="compliance" radius={[6, 6, 0, 0]} barSize={32}>
                      {tat.perTest.map((t: any, i: number) => (
                        <Cell key={i} fill={t.compliance >= 80 ? "#10b981" : t.compliance >= 60 ? "#f59e0b" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Test</th>
                        <th className="pb-2 pr-4 font-medium">Orders</th>
                        <th className="pb-2 pr-4 font-medium">On time</th>
                        <th className="pb-2 pr-4 font-medium">Avg actual</th>
                        <th className="pb-2 font-medium">Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tat.perTest.map((t: any) => (
                        <tr key={t.name} className="border-b last:border-0">
                          <td className="py-2.5 pr-4 font-medium">{t.name}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{t.total}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{t.compliant}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{t.avgActual}h</td>
                          <td className="py-2.5">
                            <Badge variant="outline" className={cn("text-xs", t.compliance >= 80 ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : t.compliance >= 60 ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400" : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400")}>{t.compliance}%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Aging stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Fresh (< 4h)" value={aging.buckets.fresh} icon={Clock} accent="emerald" sub="within target" />
            <StatCard label="Aging (4–8h)" value={aging.buckets.aging} icon={Clock} accent="blue" sub="monitor closely" />
            <StatCard label="Stale (8–24h)" value={aging.buckets.stale} icon={AlertTriangle} accent="amber" sub="approaching TAT" />
            <StatCard label="Critical (> 24h)" value={aging.buckets.critical} icon={AlertTriangle} accent="rose" sub="TAT breached" />
          </div>

          {/* Aging distribution + sample list */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <h3 className="mb-1 font-semibold">Aging Distribution</h3>
              <p className="mb-4 text-sm text-muted-foreground">{aging.total} active samples</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: "<4h", count: aging.buckets.fresh },
                  { name: "4-8h", count: aging.buckets.aging },
                  { name: "8-24h", count: aging.buckets.stale },
                  { name: ">24h", count: aging.buckets.critical },
                ]} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                    {[0, 1, 2, 3].map((i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h3 className="mb-3 font-semibold">Active Samples by Age</h3>
              {aging.samples.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No active samples" description="All samples are completed or rejected." />
              ) : (
                <ScrollArea className="max-h-[420px]">
                  <div className="space-y-1">
                    {aging.samples.map((s: any) => (
                      <div key={s.id} className={cn("flex items-center gap-3 rounded-lg border p-3", s.overdue ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20" : "border-border")}>
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", SAMPLE_STATUS_COLOR[s.status] || "bg-slate-500")}>
                          <TestTubeIcon />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{s.patient}</p>
                            <span className="font-mono text-xs text-muted-foreground">{s.barcode}</span>
                            {s.overdue && <Badge variant="outline" className="border-rose-300 text-xs text-rose-700 dark:border-rose-800 dark:text-rose-400">OVERDUE</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{s.orderCode} · {s.tests} · {s.status}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-sm font-semibold", s.overdue ? "text-rose-600" : s.ageHours > 8 ? "text-amber-600" : "text-foreground")}>{s.ageHours}h</p>
                          <p className="text-[11px] text-muted-foreground">{s.overdue ? `${Math.abs(s.remainingHours).toFixed(0)}h over` : `${s.remainingHours}h left`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function TestTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2 9 7.5 6 10.5l-2.5 2.5a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L12 16.5l3-3L20.5 8" />
      <path d="M9 7.5 14.5 2" />
    </svg>
  )
}

function ComplianceGauge({ value }: { value: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference * 0.75 // 270° arc
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444"
  return (
    <div className="relative flex h-44 w-44 items-center justify-center">
      <svg className="h-44 w-44 -rotate-[135deg]" viewBox="0 0 176 176">
        <circle cx="88" cy="88" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeLinecap="round" />
        <circle cx="88" cy="88" r={radius} fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-xs text-muted-foreground">on time</span>
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
