"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Microscope, AlertTriangle, ArrowRight, ClipboardList, ChevronRight, Siren,
} from "lucide-react"
import { RESULT_FLAG, ORDER_STATUS, PRIORITY } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

// Parse referenceRanges JSON string → first range → "low - high unit"
function parseRefRange(rangesJson: string | null | undefined, unit?: string | null): string {
  if (!rangesJson) return "—"
  try {
    const ranges = JSON.parse(rangesJson)
    if (!Array.isArray(ranges) || ranges.length === 0) return "—"
    const r = ranges[0]
    if (r && typeof r.low === "number" && typeof r.high === "number") {
      return `${r.low} - ${r.high} ${unit || ""}`.trim()
    }
    return "—"
  } catch {
    return "—"
  }
}

export function ResultsView() {
  const { navigate, can } = useApp()

  const { data, isLoading } = useQuery({
    queryKey: ["orders", "results-queue"],
    queryFn: () => api.get<{ orders: any[] }>("/api/orders?limit=200"),
  })

  const allOrders = data?.orders ?? []

  // Orders needing results: any orderTest with no result, or with an ENTERED (non-approved) result
  const queueOrders = useMemo(() => {
    return allOrders.filter((o) =>
      o.orderTests?.some((ot: any) => ot.results.length === 0 || ot.results[0]?.status === "ENTERED"),
    )
  }, [allOrders])

  // Critical alerts: orders that have any result with CRITICAL_LOW / CRITICAL_HIGH flag
  const criticalOrders = useMemo(() => {
    return allOrders
      .map((o) => {
        const criticalResults = (o.orderTests || []).flatMap((ot: any) =>
          (ot.results || [])
            .filter((r: any) => r.flag === "CRITICAL_LOW" || r.flag === "CRITICAL_HIGH")
            .map((r: any) => ({ ot, result: r })),
        )
        return criticalResults.length ? { order: o, criticalResults } : null
      })
      .filter(Boolean) as { order: any; criticalResults: { ot: any; result: any }[] }[]
  }, [allOrders])

  if (isLoading) return <ResultsSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result Entry"
        subtitle="Pending results awaiting entry and verification"
      />

      {/* Critical alerts */}
      {criticalOrders.length > 0 && (
        <Card className="overflow-hidden border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex items-center gap-2 border-b border-rose-200 px-5 py-3 dark:border-rose-900/60">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15">
              <Siren className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                {criticalOrders.length} critical value alert{criticalOrders.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Results flagged critical require immediate pathologist review and clinician notification.
              </p>
            </div>
          </div>
          <div className="divide-y divide-rose-200 dark:divide-rose-900/40">
            {criticalOrders.map(({ order, criticalResults }) => (
              <button
                key={order.id}
                onClick={() => navigate("order-detail", order.id)}
                className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-rose-100/60 dark:hover:bg-rose-950/50"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-rose-900 dark:text-rose-100">
                      {order.patient.firstName} {order.patient.lastName}
                    </p>
                    <Badge variant="outline" className="border-rose-300 font-mono text-[10px] text-rose-700 dark:border-rose-800 dark:text-rose-300">
                      {order.orderCode}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {criticalResults.map(({ ot, result }, idx) => {
                      const flag = RESULT_FLAG[result.flag as keyof typeof RESULT_FLAG]
                      return (
                        <span
                          key={idx}
                          className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", flag?.badge)}
                        >
                          {ot.test.shortName || ot.test.code}: {result.value} {result.unit}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-rose-500" />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Queue */}
      {queueOrders.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={Microscope}
            title="No pending results"
            description="All orders have results entered and verified. New pending results will appear here."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Result Queue</h3>
              <Badge variant="secondary" className="text-[10px]">{queueOrders.length}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Orders with pending or unverified results</p>
          </div>
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {queueOrders.map((o) => (
                <QueueRow key={o.id} order={o} canWrite={can("results.write")} />
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}

function QueueRow({ order, canWrite }: { order: any; canWrite: boolean }) {
  const { navigate } = useApp()
  const st = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]
  const pr = PRIORITY[order.priority as keyof typeof PRIORITY]

  // Pending tests in this order: no result yet OR ENTERED (unverified)
  const pendingTests = (order.orderTests || []).filter(
    (ot: any) => ot.results.length === 0 || ot.results[0]?.status === "ENTERED",
  )

  const open = () => navigate("order-detail", order.id)

  return (
    <div className="px-4 py-4 transition-colors hover:bg-muted/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        {/* Order header */}
        <button onClick={open} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white", st?.color)}>
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
              <Badge variant="outline" className="font-mono text-[10px]">{order.orderCode}</Badge>
              <Badge variant="outline" className="font-mono text-[10px]">{order.patient.patientCode}</Badge>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", pr?.color)}>{pr?.label}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium text-white", st?.color)}>{st?.label}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingTests.length} pending · ordered {formatDateTime(order.createdAt)}
              {order.doctor && ` · ref: ${order.doctor.name}`}
            </p>
          </div>
        </button>

        {canWrite && (
          <Button size="sm" className="shrink-0 gap-1.5" onClick={open}>
            <Microscope className="h-3.5 w-3.5" /> Enter Results <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Pending test chips */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pendingTests.map((ot: any) => {
          const result = ot.results[0]
          const flag = result ? RESULT_FLAG[result.flag as keyof typeof RESULT_FLAG] : null
          const refText = parseRefRange(ot.test.referenceRanges, ot.test.unit)
          return (
            <div key={ot.id} className="rounded-lg border bg-card/60 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {ot.test.shortName || ot.test.name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">{ot.test.code}</p>
                </div>
                {result ? (
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium", flag?.badge)}>
                    {flag?.label}
                  </span>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[9px] text-amber-700 dark:text-amber-400">
                    pending
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                {result ? (
                  <p className="font-mono text-sm font-semibold">
                    {result.value} <span className="text-[10px] font-normal text-muted-foreground">{result.unit || ot.test.unit}</span>
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">awaiting entry</p>
                )}
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">Ref: {refText}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Card className="overflow-hidden">
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  )
}
