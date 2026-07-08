"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Receipt, Search, Wallet, TrendingUp, AlertCircle } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { INVOICE_STATUS } from "@/lib/constants"
import { cn } from "@/lib/utils"

type InvoiceStatus = keyof typeof INVOICE_STATUS

interface InvoiceListItem {
  id: string
  invoiceCode: string
  status: InvoiceStatus
  subtotal: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  invoiceDate: string
  patient: { firstName: string; lastName: string; patientCode: string; phone: string | null }
  order: { orderCode: string } | null
  _count: { payments: number }
}

const STATUS_TABS = ["ALL", ...Object.keys(INVOICE_STATUS)] as const

export function InvoicesView() {
  const { navigate } = useApp()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string>("ALL")

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", q, status],
    queryFn: () => api.get<{ invoices: InvoiceListItem[] }>(`/api/invoices?q=${encodeURIComponent(q)}&status=${status}`),
  })

  const invoices = data?.invoices ?? []

  const stats = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + i.totalAmount, 0)
    const collected = invoices.reduce((s, i) => s + i.paidAmount, 0)
    const outstanding = invoices.reduce((s, i) => s + i.balanceDue, 0)
    const unpaid = invoices.filter((i) => i.status === "UNPAID" || i.status === "PARTIAL").length
    return { billed, collected, outstanding, unpaid }
  }, [invoices])

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Invoices" subtitle="Invoices, payments, and outstanding balances" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Billed" value={formatCurrency(stats.billed)} icon={TrendingUp} accent="emerald" />
        <StatCard label="Collected" value={formatCurrency(stats.collected)} icon={Wallet} accent="emerald" />
        <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} icon={AlertCircle} accent="amber" />
        <StatCard label="Unpaid Invoices" value={stats.unpaid} icon={Receipt} accent="rose" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice code, patient name, or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex h-9 flex-wrap">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {t === "ALL" ? "All" : INVOICE_STATUS[t as InvoiceStatus]?.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices found"
            description="Invoices are created automatically when a test order is placed. Try a different search or status filter."
          />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {invoices.map((inv) => {
                const st = INVOICE_STATUS[inv.status]
                return (
                  <button
                    key={inv.id}
                    onClick={() => navigate("invoice-detail", inv.id)}
                    className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {inv.patient.firstName} {inv.patient.lastName}
                          </p>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {inv.invoiceCode}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {inv.patient.patientCode}
                          </Badge>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", st?.color)}>{st?.label}</span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{formatDate(inv.invoiceDate)}</span>
                          {inv.order && <span className="font-mono">Order: {inv.order.orderCode}</span>}
                          <span>{inv._count.payments} payment{inv._count.payments !== 1 ? "s" : ""}</span>
                          {inv.patient.phone && <span>{inv.patient.phone}</span>}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold">{formatCurrency(inv.totalAmount)}</p>
                        {inv.balanceDue > 0 ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            Bal: {formatCurrency(inv.balanceDue)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Settled</p>
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
