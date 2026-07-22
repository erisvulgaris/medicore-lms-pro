"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package, MapPin, Calendar, Loader2, CheckCircle2, Clock, User, Phone, Home, ChevronRight } from "lucide-react"
import { formatCurrency, formatDateTime, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const ORDER_STATUSES = [
  { key: "PLACED", label: "Order Placed", icon: CheckCircle2, color: "bg-blue-500" },
  { key: "ASSIGNED", label: "Agent Assigned", icon: User, color: "bg-violet-500" },
  { key: "COLLECTED", label: "Sample Collected", icon: Package, color: "bg-amber-500" },
  { key: "IN_LAB", label: "Sample in Lab", icon: Home, color: "bg-cyan-500" },
  { key: "TESTING", label: "Testing in Progress", icon: Clock, color: "bg-violet-500" },
  { key: "COMPLETED", label: "Testing Complete", icon: CheckCircle2, color: "bg-emerald-500" },
  { key: "DELIVERED", label: "Report Delivered", icon: CheckCircle2, color: "bg-green-600" },
]

export function MarketplaceOrdersView({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-orders", sessionId],
    queryFn: () => api.get<{ orders: any[] }>(`/api/marketplace/orders?sessionId=${sessionId}`, { headers: { "x-session-id": sessionId } } as any),
  })

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const orders = data?.orders ?? []

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/?marketplace=1"}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
          <h1 className="flex items-center gap-2 font-bold"><Package className="h-5 w-5" /> My Orders</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="mx-auto mb-3 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Place your first order to see it here.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/?marketplace=1"}>Browse Labs</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const tests = JSON.parse(o.testsJson)
              const statusIdx = ORDER_STATUSES.findIndex((s) => s.key === o.status)
              const isCancelled = o.status === "CANCELLED"
              const currentStatus = ORDER_STATUSES[statusIdx] || ORDER_STATUSES[0]
              return (
                <Card key={o.id} className="overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b bg-muted/30 p-4">
                    <div>
                      <p className="font-mono text-sm font-bold">{o.orderCode}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <Badge className={cn("text-xs", isCancelled ? "bg-rose-500" : currentStatus.color)}>
                      {isCancelled ? "Cancelled" : currentStatus.label}
                    </Badge>
                  </div>

                  {/* Lab info */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-xs">
                      {o.lab?.displayName?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{o.lab?.displayName}</p>
                      <p className="text-xs text-muted-foreground">{o.lab?.city}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.location.href = `/?marketplace=lab&slug=${o.lab?.slug}`}>View Lab</Button>
                  </div>

                  {/* Tests */}
                  <div className="border-t px-4 py-3">
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tests ({tests.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {tests.map((t: any, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{t.testName}</Badge>)}
                    </div>
                  </div>

                  {/* Status timeline */}
                  {!isCancelled && (
                    <div className="border-t px-4 py-4">
                      <div className="flex items-center">
                        {ORDER_STATUSES.map((s, i) => {
                          const done = i < statusIdx
                          const current = i === statusIdx
                          const Icon = s.icon
                          return (
                            <div key={s.key} className="flex flex-1 items-center last:flex-none">
                              <div className="flex flex-col items-center gap-1">
                                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white transition-all", done ? s.color : current ? s.color + " ring-4 ring-primary/20" : "bg-muted text-muted-foreground")}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className={cn("hidden text-[10px] font-medium sm:block", current ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                              </div>
                              {i < ORDER_STATUSES.length - 1 && <div className={cn("mx-1 h-0.5 flex-1 rounded", i < statusIdx ? s.color : "bg-muted")} />}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 border-t px-4 py-3 text-xs sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Patient</p>
                      <p className="font-medium">{o.patientName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{o.patientPhone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Collection</p>
                      <p className="font-medium">{o.homeCollection ? "Home" : "Lab Visit"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Preferred</p>
                      <p className="font-medium">{o.preferredDate ? formatDate(o.preferredDate) : "—"}</p>
                    </div>
                  </div>

                  {/* OTP + total */}
                  <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
                    {o.pickupOtp && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Pickup OTP:</span>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-sm font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">{o.pickupOtp}</span>
                      </div>
                    )}
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(o.totalAmount)}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
