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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Wallet, Receipt, FileSpreadsheet, Download, IndianRupee, Banknote, CreditCard, Smartphone, Building2, AlertCircle, PiggyBank } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format"
import { downloadCSV, csvDate } from "@/lib/csv"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const MODE_COLORS: Record<string, string> = {
  CASH: "#10b981", CARD: "#3b82f6", UPI: "#8b5cf6", NETBANKING: "#f59e0b", CHEQUE: "#06b6d4", WALLET: "#ec4899",
}
const MODE_ICON: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, UPI: Smartphone, NETBANKING: Building2, CHEQUE: Receipt, WALLET: Wallet,
}

export function FinanceView() {
  const [range, setRange] = useState("30")
  const [tab, setTab] = useState("daily")
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-finance", range],
    queryFn: () => api.get<any>(`/api/analytics/finance?range=${range}`),
  })

  if (isLoading) return <FinanceSkeleton />
  if (!data) return null

  const exportDaily = () => {
    downloadCSV(`daily-collection-${range}d`, data.daily.map((d: any) => ({ ...d, date: csvDate(d.date + "T00:00:00") })), [
      { key: "date", label: "Date" },
      { key: "total", label: "Total" },
      { key: "cash", label: "Cash" },
      { key: "card", label: "Card" },
      { key: "upi", label: "UPI" },
      { key: "other", label: "Other" },
      { key: "count", label: "Transactions" },
    ])
    toast.success("Daily collection exported")
  }
  const exportOutstanding = () => {
    if (!data.outstanding.list.length) { toast.info("No outstanding invoices"); return }
    downloadCSV(`outstanding-${new Date().toISOString().slice(0, 10)}`, data.outstanding.list.map((i: any) => ({ ...i, invoiceDate: csvDate(i.invoiceDate) })), [
      { key: "invoiceCode", label: "Invoice" },
      { key: "patient", label: "Patient" },
      { key: "patientCode", label: "Patient Code" },
      { key: "phone", label: "Phone" },
      { key: "invoiceDate", label: "Invoice Date" },
      { key: "totalAmount", label: "Total" },
      { key: "paidAmount", label: "Paid" },
      { key: "balanceDue", label: "Balance" },
      { key: "status", label: "Status" },
      { key: "ageDays", label: "Age (days)" },
    ])
    toast.success("Outstanding exported")
  }
  const exportGst = () => {
    if (!data.gst.buckets.length) { toast.info("No GST data"); return }
    downloadCSV(`gst-report-${range}d`, data.gst.buckets, [
      { key: "rate", label: "GST Rate" },
      { key: "taxable", label: "Taxable Amount" },
      { key: "tax", label: "Tax Amount" },
      { key: "count", label: "Line Items" },
    ])
    toast.success("GST report exported")
  }

  const pnl = data.pnl
  const today = data.today

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Reports"
        subtitle="Daily collection, GST, outstanding aging, and profit & loss"
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

      {/* P&L summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatCurrency(pnl.revenue)} icon={IndianRupee} accent="emerald" sub={`${range}d period`} />
        <StatCard label="Test Cost" value={formatCurrency(pnl.cost)} icon={Wallet} accent="slate" sub="consumed reagents" />
        <StatCard label="Gross Profit" value={formatCurrency(pnl.grossProfit)} icon={TrendingUp} accent={pnl.grossProfit >= 0 ? "emerald" : "rose"} sub={`${pnl.margin}% margin`} />
        <StatCard label="Net Profit" value={formatCurrency(pnl.netProfit)} icon={PiggyBank} accent={pnl.netProfit >= 0 ? "emerald" : "rose"} sub={`after ${formatCurrency(pnl.expenses)} expenses`} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="daily" className="gap-1.5"><Receipt className="h-3.5 w-3.5" /> Daily Collection</TabsTrigger>
          <TabsTrigger value="gst" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> GST Report</TabsTrigger>
          <TabsTrigger value="outstanding" className="gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Outstanding</TabsTrigger>
          <TabsTrigger value="today" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Day Closing</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "daily" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Daily Collection — last {range} days</h3>
            <Button variant="outline" size="sm" onClick={exportDaily}><Download className="mr-2 h-3.5 w-3.5" /> Export CSV</Button>
          </div>
          <Card className="p-5">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.daily} margin={{ left: -5, right: 10, top: 5 }}>
                <defs>
                  <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(data.daily.length / 12))} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any, n: any) => [formatCurrency(v), n === "total" ? "Total" : n]} labelFormatter={(v) => formatDate(v)} />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5} fill="url(#collGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Mode breakdown */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-4 font-semibold">Payment Mode Breakdown</h3>
              {data.modeBreakdown.length === 0 ? <EmptyState icon={Wallet} title="No payments" /> : (
                <div className="space-y-3">
                  {data.modeBreakdown.map((m: any) => {
                    const Icon = MODE_ICON[m.mode] || Wallet
                    const pct = data.pnl.revenue ? Math.round((m.total / data.pnl.revenue) * 100) : 0
                    return (
                      <div key={m.mode}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-muted-foreground" /> {m.mode}</span>
                          <span>{formatCurrency(m.total)} <span className="text-muted-foreground">· {pct}%</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MODE_COLORS[m.mode] || "#64748b" }} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{m.count} transactions</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="mb-4 font-semibold">Daily Breakdown</h3>
              <ScrollArea className="max-h-72">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 text-right font-medium">Cash</th>
                      <th className="pb-2 pr-3 text-right font-medium">UPI</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.slice().reverse().filter((d: any) => d.count > 0).map((d: any) => (
                      <tr key={d.date} className="border-b last:border-0">
                        <td className="py-2 pr-3">{formatDate(d.date, { day: "2-digit", month: "short" })}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{d.cash ? formatCurrency(d.cash) : "—"}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{d.upi ? formatCurrency(d.upi) : "—"}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(d.total)}</td>
                      </tr>
                    ))}
                    {data.daily.filter((d: any) => d.count > 0).length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No collections in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}

      {tab === "gst" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">GST Report — last {range} days</h3>
            <Button variant="outline" size="sm" onClick={exportGst}><Download className="mr-2 h-3.5 w-3.5" /> Export CSV</Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Taxable" value={formatCurrency(data.gst.totalTaxable)} icon={Receipt} accent="blue" />
            <StatCard label="Total GST" value={formatCurrency(data.gst.totalTax)} icon={FileSpreadsheet} accent="violet" />
            <StatCard label="Invoices" value={formatNumber(data.gst.invoiceCount)} icon={FileSpreadsheet} accent="slate" />
          </div>
          <Card className="p-5">
            {data.gst.buckets.length === 0 ? (
              <EmptyState icon={FileSpreadsheet} title="No GST data" description="Invoices with GST-applicable line items will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">GST Rate</th>
                      <th className="pb-3 pr-4 text-right font-medium">Line Items</th>
                      <th className="pb-3 pr-4 text-right font-medium">Taxable Amount</th>
                      <th className="pb-3 text-right font-medium">Tax Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gst.buckets.map((b: any) => (
                      <tr key={b.rate} className="border-b last:border-0">
                        <td className="py-3 pr-4"><Badge variant="outline" className="font-mono">{b.rate}</Badge></td>
                        <td className="py-3 pr-4 text-right text-muted-foreground">{b.count}</td>
                        <td className="py-3 pr-4 text-right font-medium">{formatCurrency(b.taxable)}</td>
                        <td className="py-3 text-right font-medium text-violet-600 dark:text-violet-400">{formatCurrency(b.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold">
                      <td className="py-3 pr-4">Total</td>
                      <td className="py-3 pr-4" />
                      <td className="py-3 pr-4 text-right">{formatCurrency(data.gst.totalTaxable)}</td>
                      <td className="py-3 text-right text-violet-600 dark:text-violet-400">{formatCurrency(data.gst.totalTax)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "outstanding" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Outstanding Receivables — {data.outstanding.count} invoices</h3>
            <Button variant="outline" size="sm" onClick={exportOutstanding}><Download className="mr-2 h-3.5 w-3.5" /> Export CSV</Button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Current" value={formatCurrency(data.outstanding.buckets.current)} icon={Receipt} accent="emerald" sub={`${data.outstanding.bucketCounts.current} invoices`} />
            <StatCard label="1–30 days" value={formatCurrency(data.outstanding.buckets.d1_30)} icon={Clock30} accent="blue" sub={`${data.outstanding.bucketCounts.d1_30} invoices`} />
            <StatCard label="31–60 days" value={formatCurrency(data.outstanding.buckets.d31_60)} icon={Clock30} accent="amber" sub={`${data.outstanding.bucketCounts.d31_60} invoices`} />
            <StatCard label="60+ days" value={formatCurrency(data.outstanding.buckets.d60plus)} icon={AlertCircle} accent="rose" sub={`${data.outstanding.bucketCounts.d60plus} invoices`} />
          </div>
          <Card className="p-5">
            {data.outstanding.list.length === 0 ? (
              <EmptyState icon={Receipt} title="No outstanding invoices" description="All invoices are fully paid." />
            ) : (
              <ScrollArea className="max-h-[520px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Invoice</th>
                      <th className="pb-3 pr-4 font-medium">Patient</th>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 text-right font-medium">Total</th>
                      <th className="pb-3 pr-4 text-right font-medium">Balance</th>
                      <th className="pb-3 text-right font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.outstanding.list.map((i: any) => (
                      <tr key={i.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="py-2.5 pr-4"><span className="font-mono text-xs">{i.invoiceCode}</span></td>
                        <td className="py-2.5 pr-4"><span className="font-medium">{i.patient}</span><span className="ml-1 text-xs text-muted-foreground">{i.patientCode}</span></td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{formatDate(i.invoiceDate)}</td>
                        <td className="py-2.5 pr-4 text-right text-muted-foreground">{formatCurrency(i.totalAmount)}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold">{formatCurrency(i.balanceDue)}</td>
                        <td className="py-2.5 text-right">
                          <Badge variant="outline" className={cn("text-xs", i.ageDays > 60 ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400" : i.ageDays > 30 ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400" : "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400")}>
                            {i.ageDays}d
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            )}
          </Card>
        </div>
      )}

      {tab === "today" && (
        <div className="space-y-6">
          <h3 className="font-semibold">Today's Cash Closing — {formatDate(new Date())}</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Today's Total" value={formatCurrency(today.total)} icon={IndianRupee} accent="emerald" sub={`${today.count} payments`} />
            {Object.entries(today.byMode).map(([mode, amt]: any) => {
              const Icon = MODE_ICON[mode] || Wallet
              return <StatCard key={mode} label={mode} value={formatCurrency(amt)} icon={Icon} accent="slate" />
            })}
            {Object.keys(today.byMode).length === 0 && <StatCard label="No payments yet" value="₹0" icon={Wallet} accent="slate" />}
          </div>
          <Card className="p-5">
            <h4 className="mb-3 font-semibold">Today's Payments</h4>
            {today.payments.length === 0 ? (
              <EmptyState icon={Banknote} title="No payments today" description="Payments received today will appear here for end-of-day reconciliation." />
            ) : (
              <div className="space-y-1">
                {today.payments.map((p: any) => {
                  const Icon = MODE_ICON[p.mode] || Wallet
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: MODE_COLORS[p.mode] || "#64748b" }}><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.patient} <span className="ml-1 font-mono text-xs text-muted-foreground">{p.invoiceCode}</span></p>
                        <p className="text-xs text-muted-foreground">{p.mode}{p.reference ? ` · ${p.reference}` : ""} · {formatDateTime(p.paidAt)}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
                    </div>
                  )
                })}
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium">Total collected</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(today.total)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function Clock30(props: any) {
  return (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-52 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      </div>
      <div className="h-10 w-96 animate-pulse rounded bg-muted" />
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
