"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Zap, Search, ArrowRight, CheckCircle2, ChevronRight, FlaskConical, FileText, Loader2, UserPlus, Layers } from "lucide-react"
import { ORDER_STATUS, ORDER_STATUS_FLOW, PRIORITY, RESULT_FLAG } from "@/lib/constants"
import { formatCurrency, timeAgo, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ExpressRegisterDialog } from "@/components/views/express-register-dialog"

export function QuickLabView() {
  const { navigate, can } = useApp()
  const qc = useQueryClient()
  const [tab, setTab] = useState("active")
  const [selected, setSelected] = useState<string[]>([])
  const [resultInputs, setResultInputs] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ["quick-lab"],
    queryFn: () => api.get<{ orders: any[] }>("/api/orders?limit=100"),
  })

  const bulkAdvance = useMutation({
    mutationFn: (payload: { orderIds: string[]; targetStatus?: string }) => api.post<{ results: any[]; advanced: number }>("/api/orders/bulk-advance", payload),
    onSuccess: (d) => { toast.success(`${d.advanced} order(s) advanced`); setSelected([]); qc.invalidateQueries({ queryKey: ["quick-lab"] }); qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const quickResult = useMutation({
    mutationFn: (payload: { orderTestId: string; value: string }) => api.post("/api/orders/quick-result", payload),
    onSuccess: () => { toast.success("Result saved"); qc.invalidateQueries({ queryKey: ["quick-lab"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const orders = data?.orders ?? []
  const activeOrders = orders.filter((o) => !["DELIVERED", "ARCHIVED"].includes(o.status))
  const pendingResults = orders.filter((o) => o.orderTests.some((ot) => ot.results.length === 0) && ["COLLECTED", "PROCESSING", "COMPLETED", "VERIFIED"].includes(o.status))
  const pendingApproval = orders.filter((o) => o.status === "VERIFIED" || (o.orderTests.every((ot) => ot.results.length > 0) && ["COMPLETED"].includes(o.status)))

  const displayed = tab === "active" ? activeOrders : tab === "results" ? pendingResults : tab === "approval" ? pendingApproval : activeOrders

  const toggleSelect = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const bulkAdvanceSelected = (targetStatus?: string) => {
    if (selected.length === 0) { toast.error("Select at least one order"); return }
    bulkAdvance.mutate({ orderIds: selected, targetStatus })
  }

  const saveResult = (ot: any) => {
    const val = resultInputs[ot.id]
    if (!val) { toast.error("Enter a value"); return }
    quickResult.mutate({ orderTestId: ot.id, value: val })
    setResultInputs((p) => { const c = { ...p }; delete c[ot.id]; return c })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Lab"
        subtitle="Single-screen operator console — one-click workflow, inline results, bulk actions"
        actions={
          <div className="flex items-center gap-2">
            {can("orders.write") && selected.length > 0 && (
              <Button variant="outline" onClick={() => bulkAdvanceSelected()} disabled={bulkAdvance.isPending}>
                {bulkAdvance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Advance {selected.length} →
              </Button>
            )}
            {can("patients.write") && can("orders.write") && <ExpressRegisterDialog />}
          </div>
        }
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat label="Active Orders" value={activeOrders.length} color="bg-blue-500" />
        <QuickStat label="Pending Results" value={pendingResults.length} color="bg-amber-500" />
        <QuickStat label="Awaiting Approval" value={pendingApproval.length} color="bg-violet-500" />
        <QuickStat label="Selected" value={selected.length} color="bg-emerald-500" />
      </div>

      <Tabs value={tab} onValueChange={(t) => { setTab(t); setSelected([]) }}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Active ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Results ({pendingResults.length})</TabsTrigger>
          <TabsTrigger value="approval" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Approve ({pendingApproval.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setSelected([])}>Clear</Button>
            {can("orders.write") && (
              <>
                <Button size="sm" onClick={() => bulkAdvanceSelected("COLLECTED")} disabled={bulkAdvance.isPending}>→ Collected</Button>
                <Button size="sm" onClick={() => bulkAdvanceSelected("PROCESSING")} disabled={bulkAdvance.isPending}>→ Processing</Button>
                <Button size="sm" onClick={() => bulkAdvanceSelected("COMPLETED")} disabled={bulkAdvance.isPending}>→ Completed</Button>
                {(can("reports.approve") || ["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "PATHOLOGIST"].includes(useApp.getState().session?.role || "")) && (
                  <Button size="sm" variant="default" onClick={() => bulkAdvanceSelected("APPROVED")} disabled={bulkAdvance.isPending}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve All</Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Orders list with inline workflow */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : displayed.length === 0 ? (
        <EmptyState icon={Zap} title="All caught up!" description="No orders in this queue. New registrations will appear here." />
      ) : (
        <div className="space-y-2.5">
          {displayed.map((o) => {
            const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]
            const pr = PRIORITY[o.priority as keyof typeof PRIORITY]
            const stepIdx = ORDER_STATUS_FLOW.indexOf(o.status as any)
            const isSelected = selected.includes(o.id)
            const pendingTests = o.orderTests.filter((ot: any) => ot.results.length === 0)
            const hasResults = o.orderTests.some((ot: any) => ot.results.length > 0)

            return (
              <Card key={o.id} className={cn("overflow-hidden transition-all", isSelected && "ring-2 ring-primary", o.priority === "STAT" && "border-rose-200 dark:border-rose-900/50")}>
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox */}
                  {can("orders.write") && (
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(o.id)} className="mt-1" />
                  )}

                  {/* Patient info */}
                  <button onClick={() => navigate("order-detail", o.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(`${o.patient.firstName} ${o.patient.lastName}`)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{o.patient.firstName} {o.patient.lastName}</p>
                        <Badge variant="outline" className="font-mono text-[10px]">{o.orderCode}</Badge>
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", pr?.color)}>{pr?.label}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.patient.patientCode} · {o.orderTests.map((ot: any) => ot.test.shortName || ot.test.code).join(", ")}
                      </p>
                    </div>
                  </button>

                  {/* Amount */}
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{formatCurrency(o.payableAmount)}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(o.createdAt)}</p>
                  </div>
                </div>

                {/* Inline workflow stepper — the "slider" */}
                <div className="border-t bg-muted/20 px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {ORDER_STATUS_FLOW.slice(0, 7).map((s, i) => {
                      const statusInfo = ORDER_STATUS[s as keyof typeof ORDER_STATUS]
                      const done = i < stepIdx
                      const current = i === stepIdx
                      const reachable = can("orders.write") && i > stepIdx
                      const canApprove = s === "APPROVED" ? (can("reports.approve") || ["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "PATHOLOGIST"].includes(useApp.getState().session?.role || "")) : true
                      return (
                        <TooltipProvider key={s} delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                disabled={!reachable || !canApprove || bulkAdvance.isPending}
                                onClick={() => reachable && canApprove && bulkAdvance.mutate({ orderIds: [o.id], targetStatus: s })}
                                className={cn(
                                  "group flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium transition-all",
                                  done && "text-white",
                                  current && "bg-primary/10 text-primary ring-1 ring-primary/30",
                                  !done && !current && reachable && canApprove && "text-muted-foreground hover:bg-muted hover:text-foreground",
                                  (!reachable || !canApprove) && !done && !current && "cursor-not-allowed text-muted-foreground/40",
                                )}
                                style={done ? { background: statusInfo.color } : {}}
                              >
                                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[8px]", done ? "bg-white/20" : current ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                  {done ? "✓" : i + 1}
                                </span>
                                <span className="hidden sm:inline">{statusInfo.label}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              {done ? `Completed: ${statusInfo.label}` : current ? `Current: ${statusInfo.label}` : reachable ? `Advance to ${statusInfo.label}` : statusInfo.label}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                    {/* Quick advance button */}
                    {can("orders.write") && stepIdx < 6 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 px-2 text-xs"
                        disabled={bulkAdvance.isPending}
                        onClick={() => bulkAdvance.mutate({ orderIds: [o.id] })}
                      >
                        Next <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline result entry (for results tab) */}
                {tab === "results" && pendingTests.length > 0 && can("results.write") && (
                  <div className="border-t bg-amber-50/50 px-4 py-2.5 dark:bg-amber-950/10">
                    <p className="mb-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">Enter results ({pendingTests.length} pending):</p>
                    <div className="space-y-1.5">
                      {pendingTests.map((ot: any) => {
                        const ranges = ot.test.referenceRanges ? JSON.parse(ot.test.referenceRanges) : []
                        const refText = ranges[0] ? `${ranges[0].low} - ${ranges[0].high} ${ot.test.unit || ""}` : "—"
                        return (
                          <div key={ot.id} className="flex items-center gap-2">
                            <span className="w-28 shrink-0 truncate text-xs font-medium">{ot.test.shortName || ot.test.code}</span>
                            <span className="hidden w-32 shrink-0 text-[10px] text-muted-foreground sm:inline">Ref: {refText}</span>
                            <Input
                              placeholder={ot.test.unit || "Value"}
                              value={resultInputs[ot.id] || ""}
                              onChange={(e) => setResultInputs((p) => ({ ...p, [ot.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && saveResult(ot)}
                              className="h-8 flex-1 text-sm"
                            />
                            <Button size="sm" className="h-8" onClick={() => saveResult(ot)} disabled={quickResult.isPending}>Save</Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Inline approve action (for approval tab) */}
                {tab === "approval" && hasResults && (can("reports.approve") || ["ORG_OWNER", "SUPER_ADMIN", "BRANCH_ADMIN", "PATHOLOGIST"].includes(useApp.getState().session?.role || "")) && (
                  <div className="border-t bg-violet-50/50 px-4 py-2.5 dark:bg-violet-950/10">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {o.orderTests.filter((ot: any) => ot.results.length > 0).map((ot: any) => {
                          const r = ot.results[0]
                          const flag = RESULT_FLAG[r.flag as keyof typeof RESULT_FLAG]
                          return (
                            <Badge key={ot.id} variant="outline" className={cn("text-[10px]", flag?.badge)}>
                              {ot.test.shortName}: {r.value} {r.unit}
                            </Badge>
                          )
                        })}
                      </div>
                      <Button size="sm" onClick={() => bulkAdvance.mutate({ orderIds: [o.id], targetStatus: "APPROVED" })} disabled={bulkAdvance.isPending}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve & Generate Report
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QuickStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white", color)}>
        <span className="text-lg font-bold">{value}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}
