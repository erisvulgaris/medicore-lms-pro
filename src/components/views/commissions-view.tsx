"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Stethoscope, Users, IndianRupee, Wallet, AlertTriangle, Download, TrendingUp, Info, CheckCircle2 } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/format"
import { downloadCSV } from "@/lib/csv"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const BAR_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"]

export function CommissionsView() {
  const [range, setRange] = useState("90")
  const { data, isLoading } = useQuery({
    queryKey: ["commissions", range],
    queryFn: () => api.get<any>(`/api/analytics/commissions?range=${range}`),
  })

  if (isLoading) return <CommissionsSkeleton />
  if (!data) return null

  const t = data.totals
  const chartData = data.doctors.map((d: any) => ({ name: d.name.replace("Dr. ", ""), referrals: d.referralCount, billed: d.totalBilled, commission: d.commissionEarned }))

  const exportCsv = () => {
    if (!data.doctors.length) { toast.info("No data to export"); return }
    downloadCSV(`commission-report-${range}d`, data.doctors, [
      { key: "name", label: "Doctor" },
      { key: "specialization", label: "Specialization" },
      { key: "referralCount", label: "Referrals" },
      { key: "testsReferred", label: "Tests Referred" },
      { key: "totalBilled", label: "Total Billed" },
      { key: "totalCollected", label: "Collected" },
      { key: "pendingCollection", label: "Pending Collection" },
      { key: "commissionRate", label: "Commission Rate %" },
      { key: "commissionEnabled", label: "Commission Enabled" },
      { key: "commissionEarned", label: "Commission Earned" },
      { key: "commissionPaid", label: "Commission Paid" },
    ])
    toast.success("Commission report exported")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission Reports"
        subtitle="Referral analytics and commission tracking for referring doctors"
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Compliance notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Compliance Notice</p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">{data.complianceNote}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Referrers" value={formatNumber(t.doctors)} icon={Stethoscope} accent="blue" sub={`${data.range.days}-day period`} />
        <StatCard label="Total Referrals" value={formatNumber(t.referralCount)} icon={Users} accent="violet" sub={`${formatCurrency(t.totalBilled)} billed`} />
        <StatCard label="Commission Earned" value={formatCurrency(t.commissionEarned)} icon={IndianRupee} accent="emerald" sub={`${formatCurrency(t.commissionPaid)} paid`} />
        <StatCard label="Commission Due" value={formatCurrency(t.commissionDue)} icon={Wallet} accent={t.commissionDue > 0 ? "amber" : "emerald"} sub="awaiting payout" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Referrals by Doctor</h3>
          <p className="mb-4 text-sm text-muted-foreground">Number of referred orders per doctor</p>
          {chartData.length === 0 ? <EmptyState icon={Users} title="No referrals" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ left: 10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="referrals" radius={[6, 6, 0, 0]} barSize={36}>
                  {chartData.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Billed vs Commission</h3>
          <p className="mb-4 text-sm text-muted-foreground">Revenue generated and commission earned</p>
          {chartData.length === 0 ? <EmptyState icon={TrendingUp} title="No data" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ left: 10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: any, n: any) => [formatCurrency(v), n === "billed" ? "Billed" : "Commission"]} />
                <Bar dataKey="billed" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="commission" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Doctor table */}
      <SectionCard
        title="Doctor-wise Breakdown"
        description={`${data.doctors.length} referring doctors`}
        actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-3.5 w-3.5" /> Export CSV</Button>}
      >
        {data.doctors.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No referrals in this period" description="Orders referred by doctors will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Doctor</th>
                  <th className="pb-3 pr-4 text-center font-medium">Referrals</th>
                  <th className="pb-3 pr-4 text-right font-medium">Billed</th>
                  <th className="pb-3 pr-4 text-right font-medium">Collected</th>
                  <th className="pb-3 pr-4 text-center font-medium">Rate</th>
                  <th className="pb-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.doctors.map((d: any, i: number) => (
                  <tr key={d.doctorId} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}>
                          {d.name.replace("Dr. ", "").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.specialization}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center font-medium">{d.referralCount}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(d.totalBilled)}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className="font-medium">{formatCurrency(d.totalCollected)}</span>
                      {d.pendingCollection > 0 && <p className="text-[11px] text-amber-600">{formatCurrency(d.pendingCollection)} pending</p>}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {d.commissionEnabled ? (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400">{d.commissionRate}%</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {d.commissionEnabled ? (
                        <div>
                          <span className="font-semibold text-emerald-600">{formatCurrency(d.commissionEarned)}</span>
                          {d.commissionEarned - d.commissionPaid > 0 && <p className="text-[11px] text-amber-600">{formatCurrency(d.commissionEarned - d.commissionPaid)} due</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">disabled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-semibold">
                  <td className="py-3 pr-4">Total</td>
                  <td className="py-3 pr-4 text-center">{t.referralCount}</td>
                  <td className="py-3 pr-4 text-right">{formatCurrency(t.totalBilled)}</td>
                  <td className="py-3 pr-4 text-right">{formatCurrency(t.totalCollected)}</td>
                  <td className="py-3 pr-4" />
                  <td className="py-3 text-right text-emerald-600">{formatCurrency(t.commissionEarned)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Top referrers highlight */}
      {data.topReferrers.length > 0 && (
        <SectionCard title="Top Referrers" description="Doctors generating the most revenue">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.topReferrers.map((d: any, i: number) => (
              <div key={d.doctorId} className={cn("rounded-xl border p-4", i === 0 ? "border-amber-300 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20" : "")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}>
                      {d.name.replace("Dr. ", "").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.referralCount} referrals</p>
                    </div>
                  </div>
                  {i === 0 && <Badge className="gap-1 bg-amber-500 text-white"><CheckCircle2 className="h-3 w-3" /> #1</Badge>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Revenue generated</span>
                  <span className="text-lg font-bold">{formatCurrency(d.totalBilled)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function CommissionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
