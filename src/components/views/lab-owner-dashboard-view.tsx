"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader,DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Store, Package, IndianRupee, Star, TrendingUp, Edit, Loader2, CheckCircle2, Clock, MapPin, Phone } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency, formatNumber, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function LabOwnerDashboardView() {
  const { can } = useApp()
  const qc = useQueryClient()
  const [tab, setTab] = useState("overview")
  const [editOpen, setEditOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-owner"],
    queryFn: () => api.get<any>("/api/marketplace/owner"),
  })

  const updateLab = useMutation({
    mutationFn: (payload: any) => api.patch("/api/marketplace/owner", payload),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["marketplace-owner"] }); setEditOpen(false) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!data) return null

  if (!data.hasLab) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lab Owner Dashboard" subtitle="Manage your marketplace presence" />
        <EmptyState icon={Store} title="Not on Marketplace" description="Your organization hasn't been published to the marketplace yet. Contact the Super Admin to publish your lab." />
      </div>
    )
  }

  const s = data.stats
  const lab = data.lab

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Owner Dashboard"
        subtitle={`${lab.displayName} · Marketplace analytics & management`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/?marketplace=lab&slug=${lab.slug}`, "_blank")}>View Public Profile</Button>
            <Button onClick={() => setEditOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Orders" value={formatNumber(s.totalOrders)} icon={Package} accent="blue" sub={`${s.ordersThisMonth} this month`} />
        <StatCard label="Revenue" value={formatCurrency(s.revenue)} icon={IndianRupee} accent="emerald" sub={`${formatCurrency(s.revenueThisMonth)} this month`} />
        <StatCard label="Platform Fee" value={formatCurrency(s.platformFeeEarned)} icon={TrendingUp} accent="amber" sub={`Net: ${formatCurrency(s.netRevenue)}`} />
        <StatCard label="Rating" value={`${s.avgRating}★`} icon={Star} accent="violet" sub={`${s.reviewCount} reviews`} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders ({s.totalOrders})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({s.reviewCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="space-y-4">
          {/* Revenue chart */}
          <Card className="p-5">
            <h3 className="mb-1 font-semibold">Revenue & Orders — Last 14 Days</h3>
            <p className="mb-4 text-sm text-muted-foreground">Daily revenue from marketplace orders</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trend} margin={{ left: -5, right: 10, top: 5 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any, n: any) => [n === "revenue" ? formatCurrency(v) : v, n === "revenue" ? "Revenue" : "Orders"]} labelFormatter={(v) => formatDate(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Lab profile summary */}
          <SectionCard title="Marketplace Profile" description="Your public-facing lab information">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileRow label="Display Name" value={lab.displayName} />
              <ProfileRow label="Slug" value={`/${lab.slug}`} />
              <ProfileRow label="City" value={lab.city} />
              <ProfileRow label="Phone" value={lab.phone} />
              <ProfileRow label="NABL Certified" value={lab.nablCertified ? `Yes (${lab.nablCertNumber || "—"})` : "No"} />
              <ProfileRow label="Home Collection" value={lab.homeCollection ? `Yes (₹${lab.homeCollectionFee})` : "No"} />
              <ProfileRow label="Hours" value={lab.open24x7 ? "24×7" : `${lab.openTime || "—"} - ${lab.closeTime || "—"}`} />
              <ProfileRow label="Status" value={lab.active ? "Active" : "Inactive"} />
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "orders" && (
        <Card className="overflow-hidden">
          {data.recentOrders.length === 0 ? (
            <EmptyState icon={Package} title="No marketplace orders yet" description="Orders placed on the marketplace will appear here." />
          ) : (
            <ScrollArea className="max-h-[65vh]">
              <div className="divide-y">
                {data.recentOrders.map((o: any) => (
                  <div key={o.id} className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{o.orderCode}</p>
                        <Badge variant="outline" className={cn("text-[10px]", o.status === "COMPLETED" || o.status === "DELIVERED" ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : o.status === "CANCELLED" ? "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400" : "border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400")}>{o.status}</Badge>
                        {o.homeCollection && <Badge variant="secondary" className="text-[10px]"><MapPin className="h-2.5 w-2.5" /> Home</Badge>}
                      </div>
                      <p className="mt-0.5 text-sm font-medium">{o.patientName} · {o.patientPhone}</p>
                      <p className="text-xs text-muted-foreground">{o.tests.map((t: any) => t.testName).join(", ")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                      {o.pickupOtp && <p className="mt-1 text-xs"><span className="text-amber-600">Pickup OTP: </span><span className="font-mono font-bold text-amber-600">{o.pickupOtp}</span></p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(o.totalAmount)}</p>
                      <Badge variant="outline" className="text-[10px]">{o.paymentMode}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}

      {tab === "reviews" && (
        <div className="space-y-3">
          {/* Rating distribution */}
          <Card className="p-5">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold">{s.avgRating}</p>
                <div className="flex justify-center">
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={cn("h-4 w-4", star <= Math.round(s.avgRating) ? "fill-amber-400 text-amber-400" : "text-muted")} />)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.reviewCount} reviews</p>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = s.ratingDistribution[star] || 0
                  const pct = s.reviewCount ? (count / s.reviewCount) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3">{star}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-muted-foreground">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Review list */}
          {data.reviews.map((r: any) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.patientName}</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />)}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
              {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
            </Card>
          ))}
          {data.reviews.length === 0 && <EmptyState icon={Star} title="No reviews yet" />}
        </div>
      )}

      {/* Edit profile dialog */}
      <EditLabDialog open={editOpen} onOpenChange={setEditOpen} lab={lab} onSave={(data) => updateLab.mutate(data)} saving={updateLab.isPending} />
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function EditLabDialog({ open, onOpenChange, lab, onSave, saving }: { open: boolean; onOpenChange: (v: boolean) => void; lab: any; onSave: (data: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    displayName: lab?.displayName || "",
    description: lab?.description || "",
    phone: lab?.phone || "",
    whatsapp: lab?.whatsapp || "",
    openTime: lab?.openTime || "",
    closeTime: lab?.closeTime || "",
    open24x7: lab?.open24x7 || false,
    homeCollection: lab?.homeCollection ?? true,
    homeCollectionFee: lab?.homeCollectionFee || 0,
    parking: lab?.parking || false,
    wheelchairAccess: lab?.wheelchairAccess || false,
    emergencyService: lab?.emergencyService || false,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Marketplace Profile</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label className="text-xs">Display Name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Open Time</Label><Input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} disabled={form.open24x7} /></div>
            <div><Label className="text-xs">Close Time</Label><Input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} disabled={form.open24x7} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.open24x7} onCheckedChange={(v) => setForm({ ...form, open24x7: v })} /> Open 24×7</label>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Home Collection Fee (₹)</Label><Input type="number" value={form.homeCollectionFee} onChange={(e) => setForm({ ...form, homeCollectionFee: Number(e.target.value) })} disabled={!form.homeCollection} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.homeCollection} onCheckedChange={(v) => setForm({ ...form, homeCollection: v })} /> Home Collection Available</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.parking} onCheckedChange={(v) => setForm({ ...form, parking: v })} /> Parking</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.wheelchairAccess} onCheckedChange={(v) => setForm({ ...form, wheelchairAccess: v })} /> Wheelchair Access</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.emergencyService} onCheckedChange={(v) => setForm({ ...form, emergencyService: v })} /> Emergency Service</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
