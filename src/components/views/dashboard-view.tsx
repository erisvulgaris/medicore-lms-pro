"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ORDER_STATUS, PRIORITY, RESULT_FLAG } from "@/lib/constants"
import { formatCurrency, formatNumber, timeAgo, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  IndianRupee, Users, ClipboardList, TestTube2, AlertTriangle, FileCheck2, Home, Wallet, PackageX, TrendingUp, Activity, ArrowRight, Store,
} from "lucide-react"

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#14b8a6", "#64748b"]

export function DashboardView() {
  const { navigate, can } = useApp()
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<any>("/api/dashboard"),
  })

  if (isLoading) return <DashboardSkeleton />
  if (!data) return null

  const s = data.stats
  const criticalNotif = data.notifications?.filter((n: any) => n.type === "CRITICAL") ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of laboratory operations"
        actions={
          can("orders.write") && (
            <Button onClick={() => navigate("orders", "new")}>
              <ClipboardList className="mr-2 h-4 w-4" /> New Order
            </Button>
          )
        }
      />

      {/* Critical alert banner */}
      {criticalNotif.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{criticalNotif.length} critical value alert{criticalNotif.length > 1 ? "s" : ""} require attention</p>
            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{criticalNotif[0].message}</p>
          </div>
          <Button variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300" onClick={() => navigate("results")}>
            Review <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue (this month)" value={formatCurrency(s.revenue)} icon={IndianRupee} trend={s.revenueChange} accent="emerald" />
        <StatCard label="Total Patients" value={formatNumber(s.totalPatients)} icon={Users} trend={s.patientsChange} accent="blue" sub={`${s.patientsThisMonth} new this month`} />
        <StatCard label="Test Orders" value={formatNumber(s.totalOrders)} icon={ClipboardList} accent="violet" sub={`${s.ordersThisMonth} this month`} />
        <StatCard label="Pending Samples" value={formatNumber(s.pendingSamples)} icon={TestTube2} accent="amber" sub={`${s.pendingReports} reports pending`} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Critical Results" value={formatNumber(s.criticalResults)} icon={AlertTriangle} accent="rose" sub="needs pathologist review" />
        <StatCard label="Approved Reports" value={formatNumber(s.approvedReports)} icon={FileCheck2} accent="emerald" />
        <StatCard label="Home Collections" value={formatNumber(s.homeCollections)} icon={Home} accent="blue" />
        {can("finance.view") ? (
          <StatCard label="Outstanding" value={formatCurrency(s.outstanding)} icon={Wallet} accent="amber" />
        ) : (
          <StatCard label="Total Invoices" value={formatNumber(s.totalInvoices)} icon={Wallet} accent="slate" />
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Revenue & Activity</h3>
              <p className="text-sm text-muted-foreground">Last 14 days</p>
            </div>
            <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> {data.trend.filter((d: any) => d.revenue > 0).length} active days</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.trend} margin={{ left: -10, right: 10, top: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
                formatter={(value: any, name: any) => name === "revenue" ? [formatCurrency(value), "Revenue"] : [value, name === "orders" ? "Orders" : "Patients"]}
                labelFormatter={(v) => formatDate(v, { day: "2-digit", month: "short", year: "numeric" })}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Order status distribution */}
        <Card className="p-5">
          <h3 className="mb-1 font-semibold">Order Status</h3>
          <p className="mb-4 text-sm text-muted-foreground">Distribution by workflow stage</p>
          {data.statusDistribution.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No orders yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.statusDistribution} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {data.statusDistribution.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any, _n: any, p: any) => [v, ORDER_STATUS[p.payload.status as keyof typeof ORDER_STATUS]?.label ?? p.payload.status]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {data.statusDistribution.map((d: any, i: number) => (
                  <div key={d.status} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{ORDER_STATUS[d.status as keyof typeof ORDER_STATUS]?.label ?? d.status}</span>
                    <span className="ml-auto font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Top tests + Recent orders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Top Tests</h3>
          {data.topTests.length === 0 ? (
            <EmptyState icon={TestTube2} title="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topTests} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="text-muted-foreground" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} className="text-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Orders</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("orders")} className="text-xs">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
          </div>
          <div className="space-y-1">
            {data.recentOrders.map((o: any) => {
              const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]
              const pr = PRIORITY[o.priority as keyof typeof PRIORITY]
              return (
                <button
                  key={o.id}
                  onClick={() => navigate("order-detail", o.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white", st?.color)}>{st?.label.slice(0, 3).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{o.patient}</p>
                      <span className="text-xs text-muted-foreground">· {o.code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.patientCode} · {timeAgo(o.createdAt)}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", pr?.color)}>{pr?.label}</span>
                  <span className="hidden text-sm font-semibold sm:block">{formatCurrency(o.amount)}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      {/* TAT compliance + sample aging widget */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center p-5 text-center">
          <h3 className="mb-1 self-start font-semibold">TAT Compliance</h3>
          <p className="mb-3 self-start text-xs text-muted-foreground">last 30 days</p>
          <MiniGauge value={s.tatCompliance ?? 0} />
          <p className="mt-2 text-xs text-muted-foreground">{s.tatCompliant ?? 0} of {s.tatMeasured ?? 0} on time</p>
          <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => navigate("analytics")}>Details <ArrowRight className="ml-1 h-3 w-3" /></Button>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Sample Aging</h3>
              <p className="text-sm text-muted-foreground">{data.sampleAging?.total ?? 0} active samples · {s.overdueSamples ?? 0} overdue</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("analytics")}>View analytics <ArrowRight className="ml-1 h-3 w-3" /></Button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "< 4h", value: data.sampleAging?.buckets.fresh ?? 0, color: "#10b981" },
              { label: "4–8h", value: data.sampleAging?.buckets.aging ?? 0, color: "#3b82f6" },
              { label: "8–24h", value: data.sampleAging?.buckets.stale ?? 0, color: "#f59e0b" },
              { label: "> 24h", value: data.sampleAging?.buckets.critical ?? 0, color: "#ef4444" },
            ].map((b) => (
              <div key={b.label} className="rounded-lg border p-3 text-center">
                <div className="mx-auto mb-1.5 h-1.5 w-full rounded-full" style={{ background: b.color }} />
                <p className="text-2xl font-bold" style={{ color: b.color }}>{b.value}</p>
                <p className="text-[11px] text-muted-foreground">{b.label}</p>
              </div>
            ))}
          </div>
          {(s.overdueSamples ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>{s.overdueSamples}</strong> sample(s) have exceeded their expected TAT and require immediate attention.</span>
            </div>
          )}
        </Card>
      </div>

      {/* Marketplace widget */}
      {data.marketplace && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600/10 to-teal-600/10 px-5 py-3">
            <h3 className="flex items-center gap-2 font-semibold"><Store className="h-4 w-4 text-primary" /> Marketplace — {data.marketplace.labName}</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("lab-owner")}>Manage <ArrowRight className="ml-1 h-3 w-3" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">GMV (30d)</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(data.marketplace.gmv)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-xl font-bold">{data.marketplace.totalOrders}</p>
              <p className="text-[10px] text-muted-foreground">{data.marketplace.pendingOrders} pending · {data.marketplace.completedOrders} done</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="text-xl font-bold">{data.marketplace.rating}★</p>
              <p className="text-[10px] text-muted-foreground">{data.marketplace.reviewCount} reviews</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(data.marketplace.netRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">after {formatCurrency(data.marketplace.platformFee)} fee</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <SectionCard title="Activity Feed" description="Latest actions across the laboratory">
        <ScrollArea className="max-h-72">
          <div className="space-y-1">
            {data.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action.toLowerCase().replace(/_/g, " ")}</span>{" "}
                    <span className="font-medium">{a.entity}</span>
                    {a.details && <span className="text-muted-foreground"> — {a.details}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SectionCard>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

function MiniGauge({ value }: { value: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference * 0.75
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444"
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg className="h-32 w-32 -rotate-[135deg]" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeLinecap="round" />
        <circle cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="9" strokeDasharray={`${circumference * 0.75} ${circumference}`} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-[10px] text-muted-foreground">on time</span>
      </div>
    </div>
  )
}
