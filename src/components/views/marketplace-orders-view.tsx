"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Package, MapPin, Calendar, Loader2 } from "lucide-react"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  PLACED: { label: "Placed", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  ASSIGNED: { label: "Agent Assigned", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
  COLLECTED: { label: "Sample Collected", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  IN_LAB: { label: "In Lab", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400" },
  TESTING: { label: "Testing", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
}

export function MarketplaceOrdersView({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-orders", sessionId],
    queryFn: () => api.get<{ orders: any[] }>(`/api/marketplace/orders?sessionId=${sessionId}`, { headers: { "x-session-id": sessionId } } as any),
  })

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const orders = data?.orders ?? []

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/?marketplace=1"}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
          <h1 className="flex items-center gap-2 font-bold"><Package className="h-5 w-5" /> My Orders</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Place your first order to see it here.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/?marketplace=1"}>Browse Labs</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const st = ORDER_STATUS[o.status] || ORDER_STATUS.PLACED
              const tests = JSON.parse(o.testsJson)
              return (
                <Card key={o.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">{o.orderCode}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <Badge className={cn("text-xs", st.color)}>{st.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-xs">{o.lab?.displayName?.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="font-medium">{o.lab?.displayName}</p>
                      <p className="text-xs text-muted-foreground">{o.lab?.city}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tests.map((t: any, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{t.testName}</Badge>)}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {o.homeCollection && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Home Collection</span>}
                      {o.preferredDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(o.preferredDate).toLocaleDateString("en-IN")}</span>}
                    </div>
                    <span className="font-semibold">{formatCurrency(o.totalAmount)}</span>
                  </div>
                  {o.pickupOtp && (
                    <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/20">
                      <span className="text-amber-700 dark:text-amber-400">Pickup OTP: </span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{o.pickupOtp}</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
