"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, IndianRupee, Package, Users, CheckCircle2, Percent, Home, Loader2, Award, MapPin } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency, formatNumber, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const BAR_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"]

export function MarketplaceAnalyticsView() {
  const [range, setRange] = useState("30")
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-analytics", range],
    queryFn: () => api.get<any>(`/api/marketplace/analytics?range=${range}`),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!data) return null

  const o = data.overview

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace Analytics"
        subtitle="GMV, conversion, top labs, and geographic distribution"
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="GMV (Gross)" value={formatCurrency(o.totalGMV)} icon={IndianRupee} accent="emerald" sub={`${formatNumber(o.totalOrders)} orders`} />
        <StatCard label="Platform Revenue" value={formatCurrency(o.platformRevenue)} icon={TrendingUp} accent="blue" sub="5% commission" />
        <StatCard label="Unique Customers" value={formatNumber(o.uniqueCustomers)} icon={Users} accent="violet" />
        <StatCard label="Avg Order Value" value={formatCurrency(o.avgOrderValue)} icon={Package} accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Conversion Rate" value={`${o.conversionRate}%`} icon={Percent} accent="emerald" sub={`${o.completedOrders} completed`} />
        <StatCard label="Home Collection" value={`${o.homeCollectionRate}%`} icon={Home} accent="blue" sub="of orders" />
        <StatCard label="Cancelled" value={formatNumber(o.cancelledOrders)} icon={Package} accent="rose" />
        <StatCard label="Total Orders" value={formatNumber(o.totalOrders)} icon={Package} accent="slate" sub={`last ${range} days`} />
      </div>

      {/* GMV trend */}
      <Card className="p-5">
        <h3 className="mb-1 font-semibold">GMV Trend — Last {range} Days</h3>
        <p className="mb-4 text-sm text-muted-foreground">Daily gross merchandise value</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.trend} margin={{ left: -5, right: 10, top: 5 }}>
            <defs>
              <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(data.trend.length / 10))} />
            <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any, n: any) => [n === "gmv" ? formatCurrency(v) : v, n === "gmv" ? "GMV" : "Orders"]} labelFormatter={(v) => formatDate(v)} />
            <Area type="monotone" dataKey="gmv" stroke="#10b981" strokeWidth={2.5} fill="url(#gmvGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top labs */}
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Top Labs by GMV</h3>
          {data.topLabs.length === 0 ? <EmptyState icon={Award} title="No data" /> : (
            <div className="space-y-2">
              {data.topLabs.map((lab: any, i: number) => (
                <div key={lab.slug} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }}>{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lab.name}</p>
                    <p className="text-xs text-muted-foreground">{lab.city} · {lab.orders} orders</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(lab.gmv)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* City distribution */}
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">GMV by City</h3>
          {data.cities.length === 0 ? <EmptyState icon={MapPin} title="No data" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.cities} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: any) => [formatCurrency(v), "GMV"]} />
                <Bar dataKey="gmv" radius={[0, 6, 6, 0]} barSize={18}>
                  {data.cities.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Status distribution */}
      <SectionCard title="Order Status Distribution" description="All marketplace orders in the selected period">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(data.statusDist).map(([status, count]: [string, any]) => (
            <div key={status} className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">{status}</Badge>
            </div>
          ))}
          {Object.keys(data.statusDist).length === 0 && <p className="text-sm text-muted-foreground">No orders in this period.</p>}
        </div>
      </SectionCard>
    </div>
  )
}
