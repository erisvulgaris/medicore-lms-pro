"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Package, MapPin, Clock, User, Phone, CheckCircle2, Navigation, Loader2, ShieldCheck, Route } from "lucide-react"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function PickupDashboardView() {
  const qc = useQueryClient()
  const [tab, setTab] = useState("pending")
  const [otpDialog, setOtpDialog] = useState<{ orderId: string; orderCode: string } | null>(null)
  const [otpInput, setOtpInput] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["pickup"],
    queryFn: () => api.get<any>("/api/marketplace/pickup"),
  })

  const assign = useMutation({
    mutationFn: (orderId: string) => api.patch("/api/marketplace/pickup", { orderId, action: "assign" }),
    onSuccess: () => { toast.success("Order assigned to you"); qc.invalidateQueries({ queryKey: ["pickup"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const collect = useMutation({
    mutationFn: ({ orderId, otp }: { orderId: string; otp: string }) => api.patch("/api/marketplace/pickup", { orderId, otp, action: "collect" }),
    onSuccess: () => { toast.success("Sample collected!"); setOtpDialog(null); setOtpInput(""); qc.invalidateQueries({ queryKey: ["pickup"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!data) return null

  const s = data.stats
  const pendingOrders = data.orders.filter((o: any) => o.status === "PLACED")
  const assignedOrders = data.orders.filter((o: any) => o.status === "ASSIGNED")
  const collectedOrders = data.orders.filter((o: any) => o.status === "COLLECTED")

  const displayed = tab === "pending" ? pendingOrders : tab === "assigned" ? assignedOrders : collectedOrders

  return (
    <div className="space-y-6">
      <PageHeader title="Pickup Dashboard" subtitle="Manage home collection assignments and sample pickups" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending Pickup" value={s.pending} icon={Clock} accent="amber" sub="awaiting assignment" />
        <StatCard label="Assigned" value={assignedOrders.length} icon={User} accent="blue" sub="ready for collection" />
        <StatCard label="Collected" value={s.collected} icon={CheckCircle2} accent="emerald" sub="samples in transit" />
        <StatCard label="Total Today" value={s.total} icon={Package} accent="violet" />
      </div>

      {/* Route summary */}
      {data.routes?.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4 text-primary" /> Route Summary</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.routes.map((r: any) => (
              <div key={r.area} className="flex items-center justify-between rounded-lg border p-2.5">
                <div>
                  <p className="text-sm font-medium">{r.area}</p>
                  <p className="text-xs text-muted-foreground">{r.count} pickup{r.count > 1 ? "s" : ""}</p>
                </div>
                <Badge variant="outline">{r.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({assignedOrders.length})</TabsTrigger>
          <TabsTrigger value="collected">Collected ({collectedOrders.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {displayed.length === 0 ? (
        <EmptyState icon={Package} title="No orders in this queue" description="Orders requiring pickup will appear here." />
      ) : (
        <div className="space-y-3">
          {displayed.map((o: any) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", o.status === "COLLECTED" ? "bg-emerald-100 text-emerald-600" : o.status === "ASSIGNED" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold">{o.orderCode}</p>
                    <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                    {o.pickupOtp && <Badge className="bg-amber-100 text-amber-700 text-[10px] dark:bg-amber-950 dark:text-amber-400">OTP: {o.pickupOtp}</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{o.patientName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {o.patientPhone}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.address}, {o.city}</span>
                    {o.preferredDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(o.preferredDate)} · {o.timeSlot}</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {o.tests.map((t: any, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{t.testName}</Badge>)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(o.totalAmount)}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="mt-3 flex items-center gap-2 border-t pt-2">
                {o.status === "PLACED" && (
                  <Button size="sm" onClick={() => assign.mutate(o.id)} disabled={assign.isPending}>
                    <User className="mr-1.5 h-3.5 w-3.5" /> Assign to Me
                  </Button>
                )}
                {o.status === "ASSIGNED" && (
                  <>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOtpDialog({ orderId: o.id, orderCode: o.orderCode })}>
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Verify OTP & Collect
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://www.openstreetmap.org/?mlat=&mlon=&q=${encodeURIComponent(o.address + ", " + o.city)}#map=16`, "_blank")}>
                      <Navigation className="mr-1.5 h-3.5 w-3.5" /> Navigate
                    </Button>
                  </>
                )}
                {o.status === "COLLECTED" && (
                  <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Sample Collected</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* OTP verification dialog */}
      <Dialog open={!!otpDialog} onOpenChange={(v) => !v && setOtpDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Verify Pickup OTP</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-3 text-sm text-muted-foreground">Ask the patient for the 4-digit OTP to confirm sample collection for <strong>{otpDialog?.orderCode}</strong>.</p>
            <Input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="Enter 4-digit OTP"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={4}
              inputMode="numeric"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtpDialog(null)}>Cancel</Button>
            <Button onClick={() => otpDialog && collect.mutate({ orderId: otpDialog.orderId, otp: otpInput })} disabled={otpInput.length !== 4 || collect.isPending}>
              {collect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
