"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Store, Package, IndianRupee, Star, ShieldCheck, AlertTriangle, Ticket, Loader2, CheckCircle2, MapPin } from "lucide-react"
import { formatCurrency, formatNumber, formatDate, formatDateTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MarketplaceAdminView() {
  const [tab, setTab] = useState("overview")

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-admin"],
    queryFn: () => api.get<any>("/api/marketplace/admin"),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!data) return null

  const o = data.overview

  return (
    <div className="space-y-6">
      <PageHeader title="Marketplace Admin" subtitle="Manage labs, orders, reviews, and coupons across the marketplace" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Labs" value={formatNumber(o.totalLabs)} icon={Store} accent="blue" sub={`${o.activeLabs} active · ${o.verifiedLabs} verified`} />
        <StatCard label="Total Orders" value={formatNumber(o.totalOrders)} icon={Package} accent="violet" />
        <StatCard label="GMV (Gross)" value={formatCurrency(o.totalRevenue)} icon={IndianRupee} accent="emerald" sub={`Platform: ${formatCurrency(o.platformRevenue)}`} />
        <StatCard label="Reviews" value={formatNumber(o.totalReviews)} icon={Star} accent="amber" sub={`${o.reportedReviews} reported`} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="labs">Labs ({o.totalLabs})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({o.totalOrders})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({o.totalReviews})</TabsTrigger>
          <TabsTrigger value="coupons">Coupons ({o.totalCoupons})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Order status breakdown */}
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Order Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(o.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                  <span className="font-medium">{status}</span>
                  <Badge variant="outline">{count as number}</Badge>
                </div>
              ))}
              {Object.keys(o.statusBreakdown).length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
            </div>
          </Card>

          {/* Top labs */}
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Top Labs by Orders</h3>
            <div className="space-y-2">
              {data.labs.slice(0, 5).map((lab: any, i: number) => (
                <div key={lab.id} className="flex items-center gap-3 rounded-lg border p-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lab.displayName}</p>
                    <p className="text-xs text-muted-foreground">{lab.city} · {lab.rating}★</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{lab.orderCount}</p>
                    <p className="text-[10px] text-muted-foreground">orders</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "labs" && (
        <Card className="overflow-hidden">
          <ScrollArea className="max-h-[65vh]">
            <div className="divide-y">
              {data.labs.map((lab: any) => (
                <div key={lab.id} className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(lab.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{lab.displayName}</p>
                      {lab.verified && <Badge className="gap-1 bg-emerald-500 text-white text-[10px]"><ShieldCheck className="h-2.5 w-2.5" /> Verified</Badge>}
                      {lab.featured && <Badge className="bg-amber-500 text-white text-[10px]">Featured</Badge>}
                      {!lab.active && <Badge variant="outline" className="text-[10px] text-rose-600">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{lab.address}, {lab.city} · {lab.rating}★ ({lab.reviewCount})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{lab.orderCount} orders</p>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(`/?marketplace=lab&slug=${lab.slug}`, "_blank")}>View</Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {tab === "orders" && (
        <Card className="overflow-hidden">
          {data.orders.length === 0 ? (
            <EmptyState icon={Package} title="No marketplace orders" />
          ) : (
            <ScrollArea className="max-h-[65vh]">
              <div className="divide-y">
                {data.orders.map((o: any) => (
                  <div key={o.id} className="flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Package className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{o.orderCode}</p>
                        <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{o.patientName} · {o.lab?.displayName}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(o.totalAmount)}</p>
                      <p className="text-[10px] text-muted-foreground">{o.paymentMode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}

      {tab === "reviews" && (
        <Card className="overflow-hidden">
          {data.reviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews" />
          ) : (
            <ScrollArea className="max-h-[65vh]">
              <div className="divide-y">
                {data.reviews.map((r: any) => (
                  <div key={r.id} className="flex items-start gap-3 p-4">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", r.reported ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600")}>
                      {r.reported ? <AlertTriangle className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{r.patientName}</p>
                        <div className="flex">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />)}</div>
                        {r.reported && <Badge variant="outline" className="border-rose-300 text-[10px] text-rose-600">Reported</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{r.lab?.displayName}</p>
                      {r.title && <p className="mt-1 text-sm font-medium">{r.title}</p>}
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}

      {tab === "coupons" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.coupons.map((c: any) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"><Ticket className="h-4 w-4" /></div>
                  <div>
                    <p className="font-mono text-sm font-bold">{c.code}</p>
                    <p className="text-[10px] text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", c.active ? "border-emerald-300 text-emerald-700" : "text-muted-foreground")}>{c.active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.discountType === "PERCENT" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}</span>
                <span className="text-muted-foreground">{c.usedCount} uses</span>
              </div>
            </Card>
          ))}
          {data.coupons.length === 0 && <EmptyState icon={Ticket} title="No coupons" />}
        </div>
      )}
    </div>
  )
}
