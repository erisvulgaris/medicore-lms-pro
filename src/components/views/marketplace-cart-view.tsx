"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ShoppingCart, Trash2, Loader2, CheckCircle2, Home, MapPin, Tag, Receipt } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function MarketplaceCartView({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient()
  const [checkout, setCheckout] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null)
  const [form, setForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "", patientAge: "", patientGender: "Male",
    address: "", city: "Bengaluru", postalCode: "", preferredDate: "", timeSlot: "07:00-09:00",
    homeCollection: true, couponCode: "", paymentMode: "COD",
  })

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-cart", sessionId],
    queryFn: () => api.get<{ cart: any }>(`/api/marketplace/cart?sessionId=${sessionId}`, { headers: { "x-session-id": sessionId } } as any),
  })

  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/api/marketplace/cart?itemId=${itemId}&sessionId=${sessionId}`, { headers: { "x-session-id": sessionId } } as any),
    onSuccess: () => { toast.success("Item removed"); qc.invalidateQueries({ queryKey: ["marketplace-cart", sessionId] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const placeOrder = useMutation({
    mutationFn: () => api.post("/api/marketplace/orders", { sessionId, ...form, patientAge: form.patientAge ? Number(form.patientAge) : undefined }, { headers: { "x-session-id": sessionId } } as any),
    onSuccess: (d: any) => { setOrderPlaced(d.order.orderCode); toast.success("Order placed!"); qc.invalidateQueries({ queryKey: ["marketplace-cart", sessionId] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const cart = data?.cart
  const items = cart?.items ?? []
  const subtotal = items.reduce((s: number, i: any) => s + i.price, 0)
  const homeCollectionFee = form.homeCollection && cart?.lab ? (cart.lab.homeCollectionFee || 0) : 0
  const platformFee = Math.round(subtotal * 0.05)
  const total = subtotal + homeCollectionFee + platformFee

  if (orderPlaced) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid p-6">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold">Order Placed Successfully!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Order Code: <span className="font-mono font-semibold text-emerald-600">{orderPlaced}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">We'll contact you on <strong>{form.patientPhone}</strong> to confirm your collection slot.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/?marketplace=1"}>Continue Shopping</Button>
            <Button onClick={() => window.location.href = `/?marketplace=orders&sessionId=${sessionId}`}>View Orders</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/?marketplace=1"}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
          <h1 className="flex items-center gap-2 font-bold"><ShoppingCart className="h-5 w-5" /> Your Cart</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse labs and add tests to get started.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/?marketplace=1"}>Browse Labs</Button>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Cart items */}
            <div className="space-y-2 lg:col-span-2">
              {cart?.lab && (
                <Card className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{cart.lab.displayName.slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cart.lab.displayName}</p>
                    <p className="text-xs text-muted-foreground">{cart.lab.city}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => window.location.href = `/?marketplace=lab&slug=${cart.lab.slug}`}>View Lab</Button>
                </Card>
              )}
              {items.map((item: any) => (
                <Card key={item.id} className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.testName}</p>
                    {item.testCode && <p className="text-xs text-muted-foreground font-mono">{item.testCode}</p>}
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(item.price)}</span>
                  <Button variant="ghost" size="icon" className="ml-2 h-8 text-rose-600" onClick={() => removeItem.mutate(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              ))}
            </div>

            {/* Order summary + checkout */}
            <div className="space-y-3">
              <Card className="p-4">
                <h3 className="mb-3 font-semibold">Order Summary</h3>
                <div className="space-y-1.5 text-sm">
                  <Row label={`Subtotal (${items.length} tests)`} value={formatCurrency(subtotal)} />
                  {form.homeCollection && <Row label="Home Collection" value={homeCollectionFee > 0 ? formatCurrency(homeCollectionFee) : "FREE"} />}
                  <Row label="Platform Fee (5%)" value={formatCurrency(platformFee)} muted />
                  <div className="my-2 border-t" />
                  <Row label="Total" value={formatCurrency(total)} bold />
                </div>
              </Card>

              {!checkout ? (
                <Button className="w-full" onClick={() => setCheckout(true)}>Proceed to Checkout</Button>
              ) : (
                <Card className="p-4">
                  <h3 className="mb-3 font-semibold">Patient Details</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Name *</Label><Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
                      <div><Label className="text-xs">Phone *</Label><Input value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Age</Label><Input type="number" value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} /></div>
                      <div><Label className="text-xs">Gender</Label>
                        <Select value={form.patientGender} onValueChange={(v) => setForm({ ...form, patientGender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                    <div><Label className="text-xs">Address *</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Flat, street, area" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                      <div><Label className="text-xs">PIN</Label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Preferred Date</Label><Input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} /></div>
                      <div><Label className="text-xs">Time Slot</Label>
                        <Select value={form.timeSlot} onValueChange={(v) => setForm({ ...form, timeSlot: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="06:00-08:00">6-8 AM</SelectItem><SelectItem value="07:00-09:00">7-9 AM</SelectItem><SelectItem value="08:00-10:00">8-10 AM</SelectItem><SelectItem value="16:00-18:00">4-6 PM</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.homeCollection} onChange={(e) => setForm({ ...form, homeCollection: e.target.checked })} className="rounded" />
                      <Home className="h-4 w-4" /> Home collection (+{homeCollectionFee > 0 ? formatCurrency(homeCollectionFee) : "FREE"})
                    </label>
                    <div><Label className="text-xs">Coupon Code</Label><div className="flex gap-2"><Input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} placeholder="WELCOME10" /><Button variant="outline" size="sm"><Tag className="h-3.5 w-3.5" /></Button></div></div>
                    <div><Label className="text-xs">Payment</Label>
                      <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COD">Cash on Collection</SelectItem><SelectItem value="ONLINE" disabled>Online (coming soon)</SelectItem></SelectContent></Select>
                    </div>
                    <Button className="w-full" onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending || !form.patientName || !form.patientPhone || !form.address}>
                      {placeOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Place Order · {formatCurrency(total)}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return <div className="flex justify-between"><span className={cn(muted && "text-muted-foreground")}>{label}</span><span className={cn(bold && "font-bold text-base")}>{value}</span></div>
}
