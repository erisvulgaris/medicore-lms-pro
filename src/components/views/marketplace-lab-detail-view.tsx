"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Star, Clock, ShieldCheck, Home, CheckCircle2, Phone, Mail, Globe, ArrowLeft, ShoppingCart, Plus, Loader2, MessageSquare } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function MarketplaceLabDetailView({ slug }: { slug: string }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState("tests")
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [reviewOpen, setReviewOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-lab", slug],
    queryFn: () => api.get<{ lab: any; tests: any[]; profiles: any[]; packages: any[] }>(`/api/marketplace/labs/${slug}`),
  })

  const addToCart = useMutation({
    mutationFn: (payload: any) => api.post("/api/marketplace/cart", payload),
    onSuccess: () => { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["marketplace-cart", sessionId] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!data) return <div className="flex min-h-screen items-center justify-center"><p>Lab not found</p></div>

  const { lab, tests, profiles, packages } = data

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      <div className="relative h-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 sm:h-56">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute left-4 top-4">
          <Button variant="secondary" size="sm" onClick={() => window.location.href = "/?marketplace=1"}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      {/* Lab header */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-background bg-card text-2xl font-bold text-primary shadow-lg">
            {lab.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">{lab.displayName}</h1>
              {lab.verified && <Badge className="gap-1 bg-emerald-500 text-white"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>}
              {lab.featured && <Badge className="gap-1 bg-amber-500 text-white"><Star className="h-3 w-3" /> Featured</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {lab.address}, {lab.city}</span>
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {lab.rating} ({lab.reviewCount})</span>
              {lab.open24x7 ? <span className="flex items-center gap-1 text-emerald-600"><Clock className="h-3.5 w-3.5" /> Open 24×7</span> : <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {lab.openTime}–{lab.closeTime}</span>}
            </div>
          </div>
          <div className="flex gap-2 pb-2">
            <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Review</Button>
            <Button size="sm" onClick={() => window.location.href = `/?marketplace=cart&sessionId=${sessionId}`}><ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Cart</Button>
          </div>
        </div>

        {/* Quick info badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {lab.nablCertified && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3 text-emerald-600" /> NABL: {lab.nablCertNumber}</Badge>}
          {lab.homeCollection && <Badge variant="secondary" className="gap-1"><Home className="h-3 w-3" /> Home Collection {lab.homeCollectionFee > 0 ? `₹${lab.homeCollectionFee}` : "FREE"}</Badge>}
          {lab.parking && <Badge variant="outline">Parking</Badge>}
          {lab.wheelchairAccess && <Badge variant="outline">Wheelchair Access</Badge>}
          {lab.emergencyService && <Badge variant="outline">Emergency Service</Badge>}
        </div>

        {lab.description && <p className="mt-4 text-sm text-muted-foreground">{lab.description}</p>}

        {/* Contact */}
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <a href={`tel:${lab.phone}`} className="flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted"><Phone className="h-4 w-4 text-primary" /> {lab.phone}</a>
          {lab.email && <a href={`mailto:${lab.email}`} className="flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted"><Mail className="h-4 w-4 text-primary" /> {lab.email}</a>}
          {lab.website && <a href={lab.website} target="_blank" className="flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted"><Globe className="h-4 w-4 text-primary" /> Website</a>}
        </div>

        {/* OpenStreetMap */}
        {lab.latitude && lab.longitude && (
          <Card className="mt-4 overflow-hidden p-0">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lab.longitude - 0.01},${lab.latitude - 0.01},${lab.longitude + 0.01},${lab.latitude + 0.01}&layer=mapnik&marker=${lab.latitude},${lab.longitude}`}
              className="h-48 w-full border-0"
              title="Lab location"
              loading="lazy"
            />
          </Card>
        )}

        {/* Tabs: Tests / Profiles / Packages / Reviews */}
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="tests">Tests ({tests.length})</TabsTrigger>
            <TabsTrigger value="profiles">Profiles ({profiles.length})</TabsTrigger>
            <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({lab.reviewCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 pb-12">
          {tab === "tests" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {tests.map((t) => (
                <Card key={t.id} className="flex items-center justify-between p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.category?.name || t.department} · TAT {t.tatHours}h</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(t.price)}</span>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => addToCart.mutate({ sessionId, labId: lab.id, testId: t.id, testName: t.name, testCode: t.code, price: t.price })}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
              {tests.length === 0 && <p className="text-sm text-muted-foreground">No tests available.</p>}
            </div>
          )}

          {tab === "profiles" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {profiles.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    <span className="text-sm font-semibold">{formatCurrency(p.price)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.items?.length} tests · {p.items?.map((i: any) => i.test.shortName || i.test.name).slice(0, 4).join(", ")}{p.items?.length > 4 ? "…" : ""}</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 w-full" onClick={() => {
                    p.items.forEach((item: any) => {
                      addToCart.mutate({ sessionId, labId: lab.id, testId: item.testId, testName: item.test.name, testCode: item.test.shortName, price: p.price / p.items.length })
                    })
                  }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Profile</Button>
                </Card>
              ))}
              {profiles.length === 0 && <p className="text-sm text-muted-foreground">No profiles available.</p>}
            </div>
          )}

          {tab === "packages" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {packages.map((p) => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{p.name}</p>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatCurrency(p.price)}</span>
                      {p.mrp > p.price && <p className="text-[10px] text-muted-foreground line-through">{formatCurrency(p.mrp)}</p>}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.items?.length} tests included</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 w-full" onClick={() => {
                    p.items.forEach((item: any) => {
                      addToCart.mutate({ sessionId, labId: lab.id, testId: item.testId, testName: item.test.name, testCode: item.test.shortName, price: p.price / p.items.length })
                    })
                  }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Package</Button>
                </Card>
              ))}
              {packages.length === 0 && <p className="text-sm text-muted-foreground">No packages available.</p>}
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-xl border p-4">
                <div className="text-center">
                  <p className="text-4xl font-bold">{lab.rating}</p>
                  <div className="flex justify-center">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-4 w-4", s <= Math.round(lab.rating) ? "fill-amber-400 text-amber-400" : "text-muted")} />)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{lab.reviewCount} reviews</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Write Review</Button>
              </div>
              {lab.reviews?.map((r: any) => (
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
              {(!lab.reviews || lab.reviews.length === 0) && <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>}
            </div>
          )}
        </div>
      </div>

      {/* Review dialog */}
      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} labId={lab.id} onSubmitted={() => qc.invalidateQueries({ queryKey: ["marketplace-lab", slug] })} />
    </div>
  )
}

function ReviewDialog({ open, onOpenChange, labId, onSubmitted }: { open: boolean; onOpenChange: (v: boolean) => void; labId: string; onSubmitted: () => void }) {
  const [form, setForm] = useState({ patientName: "", rating: 5, title: "", comment: "" })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.patientName) { toast.error("Name is required"); return }
    setSaving(true)
    try {
      await api.post("/api/marketplace/reviews", { labId, ...form, rating: Number(form.rating) })
      toast.success("Review submitted!")
      onSubmitted()
      onOpenChange(false)
      setForm({ patientName: "", rating: 5, title: "", comment: "" })
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Write a Review</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label className="mb-1 block text-xs">Your Name *</Label><Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} /></div>
          <div>
            <Label className="mb-1 block text-xs">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setForm({ ...form, rating: s })}>
                  <Star className={cn("h-6 w-6", s <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                </button>
              ))}
            </div>
          </div>
          <div><Label className="mb-1 block text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label className="mb-1 block text-xs">Comment</Label><Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
