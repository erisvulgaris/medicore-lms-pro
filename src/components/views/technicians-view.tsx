"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Microscope, FlaskConical, TestTube2, CheckCircle2, AlertTriangle, Download, TrendingUp, Users } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatNumber, formatDate } from "@/lib/format"
import { downloadCSV } from "@/lib/csv"
import { ROLES } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const BAR_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"]

export function TechniciansView() {
  const [range, setRange] = useState("30")
  const { data, isLoading } = useQuery({
    queryKey: ["technicians", range],
    queryFn: () => api.get<any>(`/api/analytics/technicians?range=${range}`),
  })

  if (isLoading) return <TechniciansSkeleton />
  if (!data) return null

  const t = data.totals

  const exportCsv = () => {
    if (!data.technicians.length) { toast.info("No data to export"); return }
    downloadCSV(`technician-productivity-${range}d`, data.technicians, [
      { key: "name", label: "Name" },
      { key: "role", label: "Role" },
      { key: "resultsEntered", label: "Results Entered" },
      { key: "samplesCollected", label: "Samples Collected" },
      { key: "reportsApproved", label: "Reports Approved" },
      { key: "criticalFlags", label: "Critical Flags" },
      { key: "abnormalFlags", label: "Abnormal Flags" },
    ])
    toast.success("Technician productivity exported")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician Productivity"
        subtitle="Workload, performance, and critical-value tracking by staff member"
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Export</Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Staff" value={formatNumber(t.staff)} icon={Users} accent="blue" sub={`last ${range} days`} />
        <StatCard label="Results Entered" value={formatNumber(t.resultsEntered)} icon={FlaskConical} accent="emerald" />
        <StatCard label="Samples Collected" value={formatNumber(t.samplesCollected)} icon={TestTube2} accent="violet" />
        <StatCard label="Reports Approved" value={formatNumber(t.reportsApproved)} icon={CheckCircle2} accent="amber" />
      </div>

      {/* Critical/abnormal flags banner */}
      {(t.criticalFlags > 0 || t.abnormalFlags > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{t.criticalFlags}</p>
              <p className="text-xs text-rose-600 dark:text-rose-300">Critical value flags detected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><AlertTriangle className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{t.abnormalFlags}</p>
              <p className="text-xs text-amber-600 dark:text-amber-300">Abnormal results flagged</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Results Entered — Daily Trend</h3>
          <p className="mb-4 text-sm text-muted-foreground">Last {range} days</p>
          {data.trend.length === 0 ? <EmptyState icon={TrendingUp} title="No data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trend} margin={{ left: -10, right: 10, top: 5 }}>
                <defs>
                  <linearGradient id="techGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(data.trend.length / 8))} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => [v, "Results"]} labelFormatter={(v) => formatDate(v)} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fill="url(#techGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Department Workload</h3>
          <p className="mb-4 text-sm text-muted-foreground">Results by department</p>
          {data.departments.length === 0 ? <EmptyState icon={FlaskConical} title="No data" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.departments} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                  {data.departments.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Technician table */}
      <SectionCard title="Staff Performance Breakdown" description={`${data.technicians.length} active staff members`}>
        {data.technicians.length === 0 ? (
          <EmptyState icon={Microscope} title="No activity in this period" description="Results entered and samples collected by staff will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Staff Member</th>
                  <th className="pb-3 pr-4 text-center font-medium">Results</th>
                  <th className="pb-3 pr-4 text-center font-medium">Samples</th>
                  <th className="pb-3 pr-4 text-center font-medium">Reports</th>
                  <th className="pb-3 pr-4 text-center font-medium">Critical</th>
                  <th className="pb-3 text-center font-medium">Abnormal</th>
                </tr>
              </thead>
              <tbody>
                {data.technicians.map((tech: any, i: number) => (
                  <tr key={tech.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}>
                          {tech.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{tech.name}</p>
                          <p className="text-xs text-muted-foreground">{ROLES[tech.role as keyof typeof ROLES] ?? tech.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center"><span className="font-semibold text-emerald-600">{tech.resultsEntered}</span></td>
                    <td className="py-3 pr-4 text-center"><span className="font-semibold text-violet-600">{tech.samplesCollected}</span></td>
                    <td className="py-3 pr-4 text-center"><span className="font-semibold text-amber-600">{tech.reportsApproved}</span></td>
                    <td className="py-3 pr-4 text-center">
                      {tech.criticalFlags > 0 ? <Badge variant="outline" className="border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400">{tech.criticalFlags}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-3 text-center">
                      {tech.abnormalFlags > 0 ? <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400">{tech.abnormalFlags}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 pr-4">Total</td>
                  <td className="py-3 pr-4 text-center text-emerald-600">{t.resultsEntered}</td>
                  <td className="py-3 pr-4 text-center text-violet-600">{t.samplesCollected}</td>
                  <td className="py-3 pr-4 text-center text-amber-600">{t.reportsApproved}</td>
                  <td className="py-3 pr-4 text-center text-rose-600">{t.criticalFlags}</td>
                  <td className="py-3 text-center text-amber-600">{t.abnormalFlags}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function TechniciansSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />)}</div>
    </div>
  )
}
