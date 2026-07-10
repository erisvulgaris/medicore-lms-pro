"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, MapPinned, Clock, CheckCircle2, XCircle, Phone, Navigation, Home, Route, Package } from "lucide-react"
import { formatCurrency, formatDateTime, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  COLLECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  CHECKED_IN: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
}

export function HomeCollectionView() {
  const { can, navigate } = useApp()
  const [tab, setTab] = useState("routes")
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["home-collection"],
    queryFn: () => api.get<any>("/api/home-collection"),
  })

  const update = useMutation({
    mutationFn: (payload: { id: string; kind: string; status: string }) => api.patch("/api/home-collection", payload),
    onSuccess: () => { toast.success("Collection status updated"); qc.invalidateQueries({ queryKey: ["home-collection"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <HomeCollectionSkeleton />
  if (!data) return null

  const markCollected = (r: any) => update.mutate({ id: r.id, kind: r.kind, status: "COMPLETED" })
  const cancel = (r: any) => update.mutate({ id: r.id, kind: r.kind, status: "CANCELLED" })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Collection"
        subtitle="Route planning and tracking for at-home sample collection"
        actions={can("appointments.write") ? <Button onClick={() => navigate("appointments")} variant="outline"><Home className="mr-2 h-4 w-4" /> Book Collection</Button> : undefined}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Requests" value={data.total} icon={Package} accent="blue" />
        <StatCard label="Pending" value={data.pending} icon={Clock} accent="amber" sub="awaiting collection" />
        <StatCard label="Collected" value={data.collected} icon={CheckCircle2} accent="emerald" sub="completed today" />
        <StatCard label="Areas / Routes" value={data.areas} icon={Route} accent="violet" sub="grouped by location" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="routes" className="gap-1.5"><MapPinned className="h-3.5 w-3.5" /> Route Planning</TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> All Requests</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "routes" ? (
        <div className="space-y-4">
          {data.routes.length === 0 ? (
            <EmptyState icon={MapPinned} title="No home collection requests" description="Book a home collection appointment to see route planning here." />
          ) : (
            data.routes.map((route: any, idx: number) => (
              <Card key={route.area} className="overflow-hidden">
                <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold">{route.area}</p>
                      <p className="text-xs text-muted-foreground">{route.count} request{route.count > 1 ? "s" : ""} · {formatCurrency(route.totalAmount)} total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs"><Clock className="h-3 w-3" /> {route.pending} pending</Badge>
                    {route.collected > 0 && <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 text-xs dark:border-emerald-800 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> {route.collected} done</Badge>}
                    {route.cancelled > 0 && <Badge variant="outline" className="gap-1 border-rose-300 text-rose-700 text-xs dark:border-rose-800 dark:text-rose-400"><XCircle className="h-3 w-3" /> {route.cancelled}</Badge>}
                  </div>
                </div>
                <div className="divide-y">
                  {route.items.map((r: any, i: number) => (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 text-xs font-semibold text-primary">{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{r.patientName}</p>
                          <span className="font-mono text-xs text-muted-foreground">{r.patientCode}</span>
                          <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[r.status])}>{r.status}</Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</span>
                          <span className="flex items-center gap-1"><Navigation className="h-3 w-3" /> {r.address}</span>
                          {r.scheduledAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(r.scheduledAt)}</span>}
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        {r.orderCode && <p className="font-mono text-xs text-muted-foreground">{r.orderCode}</p>}
                        <p className="text-sm font-semibold">{formatCurrency(r.amount)}</p>
                      </div>
                      {can("orders.write") && r.status === "SCHEDULED" && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400" onClick={() => markCollected(r)} disabled={update.isPending}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Collected
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => cancel(r)} disabled={update.isPending}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          {data.requests.length === 0 ? (
            <EmptyState icon={MapPin} title="No requests" />
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="divide-y">
                {data.requests.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{r.patientName}</p>
                        <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[r.status])}>{r.status}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{r.address} · {r.phone} · {r.scheduledAt ? formatDateTime(r.scheduledAt) : "—"}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}
    </div>
  )
}

function HomeCollectionSkeleton() {
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
