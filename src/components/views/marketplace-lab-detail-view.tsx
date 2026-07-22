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
import { MapPin, Star, Clock, ShieldCheck, Home, CheckCircle2, Phone, Mail, Globe, ArrowLeft, ShoppingCart, Plus, Loader2, MessageSquare, Navigation, Stethoscope, FlaskConical, Package, Award, Heart, Share2, ChevronRight } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function MarketplaceLabDetailView({ slug }: { slug: string }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState("tests")
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [searchTest, setSearchTest] = useState("")

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
  const filteredTests = tests.filter((t) => !searchTest || t.name.toLowerCase().includes(searchTest.toLowerCase()) || t.code.toLowerCase().includes(searchTest.toLowerCase()))
  const cartCount = 0 // would come from cart query

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 sm:h-64">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.location.href = "/?marketplace=1"}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All Labs
          </Button>
        </div>
        <div className="absolute right-4 top-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!") }}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast.success("Saved to wishlist!")}>
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lab header */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-background bg-card text-2xl font-bold text-primary shadow-xl">
            {lab.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl">{lab.displayName}</h1>
              {lab.verified && <Badge className="gap-1 bg-emerald-500 text-white"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>}
              {lab.featured && <Badge className="gap-1 bg-amber-500 text-white"><Award className="h-3 w-3" /> Featured</Badge>}
              {lab.nablCertified && <Badge className="gap-1 bg-blue-500 text-white"><ShieldCheck className="h-3 w-3" /> NABL</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold text-white", lab.rating >= 4.5 ? "bg-emerald-500" : lab.rating >= 4 ? "bg-emerald-600" : lab.rating >= 3 ? "bg-amber-500" : "bg-rose-500")}>
                  {lab.rating} <Star className="h-3 w-3 fill-white" />
                </span>
                <span className="text-muted-foreground">{lab.reviewCount} reviews</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" /> {lab.address}</span>
              {lab.open24x7 ? <span className="flex items-center gap-1 text-emerald-600 font-medium"><Clock className="h-4 w-4" /> Open 24×7</span> : <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-4 w-4" /> {lab.openTime} – {lab.closeTime}</span>}
            </div>
          </div>
          <div className="flex gap-2 pb-2">
            <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Review</Button>
            <Button size="sm" onClick={() => window.location.href = `/?marketplace=cart&sessionId=${sessionId}`}><ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Cart</Button>
          </div>
        </div>

        {/* Quick info cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoCard icon={Home} label="Home Collection" value={lab.homeCollection ? (lab.homeCollectionFee > 0 ? `₹${lab.homeCollectionFee}` : "FREE") : "Not available"} positive={lab.homeCollection} />
          <InfoCard icon={Clock} label="Hours" value={lab.open24x7 ? "24×7" : `${lab.openTime || "—"} - ${lab.closeTime || "—"}`} />
          <InfoCard icon={ShieldCheck} label="NABL Certified" value={lab.nablCertified ? "Yes" : "No"} positive={lab.nablCertified} />
          <InfoCard icon={Phone} label="Contact" value={lab.phone} />
        </div>

        {lab.description && (
          <Card className="mt-4 p-4">
            <p className="text-sm text-muted-foreground">{lab.description}</p>
          </Card>
        )}

        {/* Contact + facilities */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Contact Information</h3>
            <div className="space-y-2">
              <a href={`tel:${lab.phone}`} className="flex items-center gap-2 text-sm hover:text-primary"><Phone className="h-4 w-4 text-muted-foreground" /> {lab.phone}</a>
              {lab.whatsapp && <a href={`https://wa.me/${lab.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" className="flex items-center gap-2 text-sm hover:text-primary"><MessageSquare className="h-4 w-4 text-emerald-500" /> {lab.whatsapp}</a>}
              {lab.email && <a href={`mailto:${lab.email}`} className="flex items-center gap-2 text-sm hover:text-primary"><Mail className="h-4 w-4 text-muted-foreground" /> {lab.email}</a>}
              {lab.website && <a href={lab.website} target="_blank" className="flex items-center gap-2 text-sm hover:text-primary"><Globe className="h-4 w-4 text-muted-foreground" /> Visit website</a>}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Facilities</h3>
            <div className="flex flex-wrap gap-2">
              <FacilityChip icon="🅿️" label="Parking" available={lab.parking} />
              <FacilityChip icon="♿" label="Wheelchair Access" available={lab.wheelchairAccess} />
              <FacilityChip icon="🚨" label="Emergency" available={lab.emergencyService} />
              <FacilityChip icon="🏠" label="Home Collection" available={lab.homeCollection} />
              <FacilityChip icon="🕐" label="24×7" available={lab.open24x7} />
              <FacilityChip icon="✅" label="NABL" available={lab.nablCertified} />
            </div>
          </Card>
        </div>

        {/* OpenStreetMap */}
        {lab.latitude && lab.longitude && (
          <Card className="mt-4 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Location</h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${lab.latitude}&mlon=${lab.longitude}#map=16/${lab.latitude}/${lab.longitude}`, "_blank")}>
                <Navigation className="mr-1 h-3 w-3" /> Directions
              </Button>
            </div>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lab.longitude - 0.008},${lab.latitude - 0.008},${lab.longitude + 0.008},${lab.latitude + 0.008}&layer=mapnik&marker=${lab.latitude},${lab.longitude}`}
              className="h-56 w-full border-0"
              title="Lab location"
              loading="lazy"
            />
          </Card>
        )}

        {/* Services tabs */}
        <div className="mt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="tests" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Tests ({tests.length})</TabsTrigger>
              <TabsTrigger value="profiles" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Profiles ({profiles.length})</TabsTrigger>
              <TabsTrigger value="packages" className="gap-1.5"><Package className="h-3.5 w-3.5" /> Packages ({packages.length})</TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Reviews ({lab.reviewCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 pb-12">
            {tab === "tests" && (
              <div>
                <div className="mb-3 max-w-sm">
                  <Input placeholder="Search tests…" value={searchTest} onChange={(e) => setSearchTest(e.target.value)} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredTests.map((t) => (
                    <Card key={t.id} className="flex items-center justify-between p-3 transition-all hover:shadow-md">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{t.category?.name || t.department}</Badge>
                          <span>· TAT {t.tatHours}h</span>
                          {t.sampleType && <span>· {t.sampleType}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCurrency(t.price)}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => addToCart.mutate({ sessionId, labId: lab.id, testId: t.id, testName: t.name, testCode: t.code, price: t.price })}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {filteredTests.length === 0 && <p className="text-sm text-muted-foreground">No tests found.</p>}
                </div>
              </div>
            )}

            {tab === "profiles" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {profiles.map((p) => (
                  <Card key={p.id} className="p-4 transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{p.name}</p>
                      <span className="text-lg font-bold">{formatCurrency(p.price)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.items?.length} tests included</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.items?.slice(0, 5).map((item: any) => <Badge key={item.testId} variant="secondary" className="text-[10px]">{item.test.shortName || item.test.name}</Badge>)}
                      {p.items?.length > 5 && <Badge variant="outline" className="text-[10px]">+{p.items.length - 5} more</Badge>}
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => {
                      p.items.forEach((item: any) => addToCart.mutate({ sessionId, labId: lab.id, testId: item.testId, testName: item.test.name, testCode: item.test.shortName, price: p.price / p.items.length }))
                      toast.success(`Added ${p.name} to cart`)
                    }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Profile</Button>
                  </Card>
                ))}
                {profiles.length === 0 && <p className="text-sm text-muted-foreground">No profiles available.</p>}
              </div>
            )}

            {tab === "packages" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((p) => (
                  <Card key={p.id} className="overflow-hidden transition-all hover:shadow-md">
                    <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{p.name}</p>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(p.price)}</p>
                          {p.mrp > p.price && <p className="text-xs text-muted-foreground line-through">{formatCurrency(p.mrp)}</p>}
                        </div>
                      </div>
                      {p.mrp > p.price && <Badge className="mt-1 bg-rose-500 text-white text-[10px]">{Math.round((1 - p.price / p.mrp) * 100)}% OFF</Badge>}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground">{p.items?.length} tests included</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.items?.slice(0, 6).map((item: any) => <Badge key={item.testId} variant="secondary" className="text-[10px]">{item.test.shortName || item.test.name}</Badge>)}
                        {p.items?.length > 6 && <Badge variant="outline" className="text-[10px]">+{p.items.length - 6} more</Badge>}
                      </div>
                      <Button size="sm" className="mt-3 w-full" onClick={() => {
                        p.items.forEach((item: any) => addToCart.mutate({ sessionId, labId: lab.id, testId: item.testId, testName: item.test.name, testCode: item.test.shortName, price: p.price / p.items.length }))
                        toast.success(`Added ${p.name} to cart`)
                      }}><Plus className="mr-1 h-3.5 w-3.5" /> Add Package</Button>
                    </div>
                  </Card>
                ))}
                {packages.length === 0 && <p className="text-sm text-muted-foreground">No packages available.</p>}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-4">
                <Card className="p-5">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-5xl font-bold">{lab.rating}</p>
                      <div className="flex justify-center">
                        {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-5 w-5", s <= Math.round(lab.rating) ? "fill-amber-400 text-amber-400" : "text-muted")} />)}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{lab.reviewCount} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = lab.reviews?.filter((r: any) => r.rating === star).length || 0
                        const pct = lab.reviewCount ? (count / lab.reviewCount) * 100 : 0
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
                    <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Write Review</Button>
                  </div>
                </Card>
                {lab.reviews?.map((r: any) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {r.patientName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.patientName}</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />)}
                          </div>
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
      </div>

      {/* Review dialog */}
      <ReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} labId={lab.id} onSubmitted={() => qc.invalidateQueries({ queryKey: ["marketplace-lab", slug] })} />
    </div>
  )
}

function InfoCard({ icon: Icon, label, value, positive }: { icon: any; label: string; value: string; positive?: boolean }) {
  return (
    <Card className={cn("p-3", positive === false && "opacity-60")}>
      <div className="flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", positive === false ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-medium">{value}</p>
        </div>
      </div>
    </Card>
  )
}

function FacilityChip({ icon, label, available }: { icon: string; label: string; available: boolean }) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs", available ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-muted bg-muted/30 text-muted-foreground line-through")}>
      <span>{icon}</span> {label}
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
                  <Star className={cn("h-8 w-8 transition-all", s <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted hover:text-amber-300")} />
                </button>
              ))}
            </div>
          </div>
          <div><Label className="mb-1 block text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Great service!" /></div>
          <div><Label className="mb-1 block text-xs">Comment</Label><Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows={3} placeholder="Share your experience..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
