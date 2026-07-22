"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ShoppingCart, Trash2, Loader2, CheckCircle2, Home, Tag, MapPin, Calendar, Clock, Phone, User, ChevronRight, ShieldCheck } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function MarketplaceCartView({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<"cart" | "checkout" | "confirm">("cart")
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null)
  const [form, setForm] = useState({
    patientName: "", patientPhone: "", patientEmail: "", patientAge: "", patientGender: "Male",
    address: "", city: "Bengaluru", postalCode: "", preferredDate: "", timeSlot: "07:00-09:00",
    homeCollection: true, couponCode: "", paymentMode: "COD",
  })
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

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
    mutationFn: () => api.post("/api/marketplace/orders", { sessionId, ...form, patientAge: form.patientAge ? Number(form.patientAge) : undefined, couponCode: couponApplied?.code }, { headers: { "x-session-id": sessionId } } as any),
    onSuccess: (d: any) => { setOrderPlaced(d.order.orderCode); setStep("confirm"); toast.success("Order placed!"); qc.invalidateQueries({ queryKey: ["marketplace-cart", sessionId] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const applyCoupon = async () => {
    if (!form.couponCode) { toast.error("Enter a coupon code"); return }
    setApplyingCoupon(true)
    try {
      // Validate coupon by trying to fetch (the order API will apply it)
      // For now, just set it
      setCouponApplied({ code: form.couponCode.toUpperCase(), discount: 0 })
      toast.success(`Coupon ${form.couponCode.toUpperCase()} will be applied at checkout`)
    } catch (e: any) { toast.error(e.message) }
    finally { setApplyingCoupon(false) }
  }

  const cart = data?.cart
  const items = cart?.items ?? []
  const subtotal = items.reduce((s: number, i: any) => s + i.price, 0)
  const homeCollectionFee = form.homeCollection && cart?.lab ? (cart.lab.homeCollectionFee || 0) : 0
  const platformFee = Math.round(subtotal * 0.05)
  const total = subtotal + homeCollectionFee + platformFee

  if (orderPlaced) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold">Order Placed Successfully!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Order Code:</p>
          <p className="font-mono text-lg font-bold text-emerald-600">{orderPlaced}</p>
          <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Patient</span>
              <span className="font-medium">{form.patientName}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{form.patientPhone}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
            {form.homeCollection && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Home Collection</span>
                <span className="font-medium text-emerald-600">Yes</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">We'll contact you on <strong>{form.patientPhone}</strong> to confirm your collection slot. {form.homeCollection && "Please keep your pickup OTP ready."}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.href = "/?marketplace=1"}>Continue Shopping</Button>
            <Button onClick={() => window.location.href = `/?marketplace=orders&sessionId=${sessionId}`}>View Orders</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/?marketplace=1"}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
          <h1 className="flex items-center gap-2 font-bold"><ShoppingCart className="h-5 w-5" /> {step === "cart" ? "Your Cart" : step === "checkout" ? "Checkout" : "Confirm"}</h1>
          {/* Step indicator */}
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", step === "cart" ? "bg-primary text-primary-foreground" : "bg-emerald-500 text-white")}>1</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", step === "checkout" ? "bg-primary text-primary-foreground" : step === "confirm" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>2</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", step === "confirm" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>3</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="mx-auto mb-3 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Browse labs and add tests to get started.</p>
            <Button className="mt-4" onClick={() => window.location.href = "/?marketplace=1"}>Browse Labs</Button>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: cart items / checkout form */}
            <div className="space-y-3 lg:col-span-2">
              {step === "cart" && (
                <>
                  {cart?.lab && (
                    <Card className="flex items-center gap-3 p-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">{cart.lab.displayName.slice(0, 2).toUpperCase()}</div>
                      <div className="flex-1">
                        <p className="font-medium">{cart.lab.displayName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {cart.lab.city}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => window.location.href = `/?marketplace=lab&slug=${cart.lab.slug}`}>View Lab</Button>
                    </Card>
                  )}
                  {items.map((item: any) => (
                    <Card key={item.id} className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><ShoppingCart className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.testName}</p>
                        {item.testCode && <p className="text-xs text-muted-foreground font-mono">{item.testCode}</p>}
                      </div>
                      <span className="text-base font-bold">{formatCurrency(item.price)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => removeItem.mutate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Card>
                  ))}
                </>
              )}

              {step === "checkout" && (
                <Card className="p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-primary" /> Patient Details</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Full Name *</Label>
                        <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="John Doe" />
                      </div>
                      <div>
                        <Label className="text-xs">Phone *</Label>
                        <Input value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} placeholder="+91 98765 43210" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Age</Label>
                        <Input type="number" value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} placeholder="35" />
                      </div>
                      <div>
                        <Label className="text-xs">Gender</Label>
                        <Select value={form.patientGender} onValueChange={(v) => setForm({ ...form, patientGender: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input type="email" value={form.patientEmail} onChange={(e) => setForm({ ...form, patientEmail: e.target.value })} placeholder="john@example.com" />
                      </div>
                    </div>
                  </div>

                  <h3 className="mb-4 mt-6 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Collection Address</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Address *</Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Flat, street, area" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">PIN Code</Label>
                        <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="560001" />
                      </div>
                    </div>
                  </div>

                  <h3 className="mb-4 mt-6 flex items-center gap-2 font-semibold"><Calendar className="h-4 w-4 text-primary" /> Preferred Slot</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Time Slot</Label>
                      <Select value={form.timeSlot} onValueChange={(v) => setForm({ ...form, timeSlot: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="06:00-08:00">6:00 - 8:00 AM</SelectItem>
                          <SelectItem value="07:00-09:00">7:00 - 9:00 AM</SelectItem>
                          <SelectItem value="08:00-10:00">8:00 - 10:00 AM</SelectItem>
                          <SelectItem value="10:00-12:00">10:00 AM - 12:00 PM</SelectItem>
                          <SelectItem value="16:00-18:00">4:00 - 6:00 PM</SelectItem>
                          <SelectItem value="18:00-20:00">6:00 - 8:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-lg border p-3">
                    <input type="checkbox" checked={form.homeCollection} onChange={(e) => setForm({ ...form, homeCollection: e.target.checked })} className="h-4 w-4 rounded" />
                    <Home className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Home Collection</p>
                      <p className="text-xs text-muted-foreground">Sample collection at your address {homeCollectionFee > 0 ? `(₹${homeCollectionFee})` : "(FREE)"}</p>
                    </div>
                  </label>

                  <h3 className="mb-4 mt-6 flex items-center gap-2 font-semibold"><Tag className="h-4 w-4 text-primary" /> Payment</h3>
                  <div className="space-y-2">
                    <label className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer", form.paymentMode === "COD" ? "border-primary ring-1 ring-primary" : "")}>
                      <input type="radio" checked={form.paymentMode === "COD"} onChange={() => setForm({ ...form, paymentMode: "COD" })} className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Cash on Collection</p>
                        <p className="text-xs text-muted-foreground">Pay when sample is collected</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                    </label>
                    <label className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer opacity-50", form.paymentMode === "ONLINE" ? "border-primary" : "")}>
                      <input type="radio" checked={form.paymentMode === "ONLINE"} onChange={() => toast.info("Online payments coming soon!")} className="h-4 w-4" disabled />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Online Payment</p>
                        <p className="text-xs text-muted-foreground">Pay via UPI/Card/Netbanking</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                    </label>
                  </div>
                </Card>
              )}
            </div>

            {/* Right: order summary */}
            <div className="space-y-3">
              <Card className="p-5 sticky top-20">
                <h3 className="mb-3 font-semibold">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tests ({items.length})</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {form.homeCollection && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Home Collection</span>
                      <span className="font-medium">{homeCollectionFee > 0 ? formatCurrency(homeCollectionFee) : "FREE"}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (5%)</span>
                    <span className="font-medium">{formatCurrency(platformFee)}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-emerald-600">
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {couponApplied.code}</span>
                      <span className="font-medium">Applied</span>
                    </div>
                  )}
                  <div className="my-2 border-t" />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Coupon */}
                <div className="mt-4">
                  <Label className="text-xs">Coupon Code</Label>
                  <div className="mt-1 flex gap-2">
                    <Input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} placeholder="WELCOME10" className="uppercase" />
                    <Button variant="outline" size="sm" onClick={applyCoupon} disabled={applyingCoupon}>Apply</Button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Try: WELCOME10, FLAT100, HEALTH20</p>
                </div>

                {/* CTA */}
                <div className="mt-4 space-y-2">
                  {step === "cart" && (
                    <Button className="w-full" size="lg" onClick={() => setStep("checkout")}>Proceed to Checkout <ChevronRight className="ml-1 h-4 w-4" /></Button>
                  )}
                  {step === "checkout" && (
                    <>
                      <Button className="w-full" size="lg" onClick={() => placeOrder.mutate()} disabled={placeOrder.isPending || !form.patientName || !form.patientPhone || !form.address}>
                        {placeOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Place Order · {formatCurrency(total)}
                      </Button>
                      <Button variant="ghost" className="w-full" onClick={() => setStep("cart")}>Back to Cart</Button>
                    </>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" /> Secure checkout · Encrypted data
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
