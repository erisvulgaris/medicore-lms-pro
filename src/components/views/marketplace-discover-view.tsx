"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Search, Star, Clock, ShieldCheck, Home, Navigation, CheckCircle2, Loader2, MapIcon, List, X, Phone, ChevronRight, TrendingUp, Award } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function MarketplaceDiscoverView() {
  const [q, setQ] = useState("")
  const [city, setCity] = useState("ALL")
  const [sort, setSort] = useState("rating")
  const [nablOnly, setNablOnly] = useState(false)
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false)
  const [openNow, setOpenNow] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-labs", q, city, sort, nablOnly, homeCollectionOnly, openNow, featuredOnly, userLocation],
    queryFn: () => {
      const params = new URLSearchParams({ sort, nabl: String(nablOnly), homeCollection: String(homeCollectionOnly), openNow: String(openNow), featured: String(featuredOnly) })
      if (q) params.set("q", q)
      if (city !== "ALL") params.set("city", city)
      if (userLocation) { params.set("lat", String(userLocation.lat)); params.set("lng", String(userLocation.lng)); params.set("radius", "50") }
      return api.get<{ labs: any[]; cities: string[] }>(`/api/marketplace/labs?${params}`)
    },
  })

  // Search autocomplete
  const { data: searchData } = useQuery({
    queryKey: ["marketplace-search", q],
    queryFn: () => api.get<{ suggestions: any[]; trending: string[] }>(`/api/marketplace/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2 && showSearchDropdown,
  })

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location detected — showing nearby labs") },
      () => { toast.error("Could not detect location. Using default Bengaluru."); setUserLocation({ lat: 12.9756, lng: 77.6066 }) }
    )
  }

  const labs = data?.labs ?? []
  const cities = data?.cities ?? []
  const activeFilterCount = [nablOnly, homeCollectionOnly, openNow, featuredOnly].filter(Boolean).length + (userLocation ? 1 : 0)

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <MapPin className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">LabFinder</span>
              <Badge className="ml-2 bg-white/20 text-white">15 labs · 5 cities</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={() => window.location.href = "/"}>Staff Login</Button>
          </div>

          <h1 className="mt-6 text-2xl font-bold sm:text-4xl">Find the best pathology labs near you</h1>
          <p className="mt-2 text-sm text-emerald-50 sm:text-base">Compare prices, ratings, and turnaround time. Book tests online with home collection.</p>

          {/* Search bar */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by lab name, test, or area…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setShowSearchDropdown(true) }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="h-12 border-0 bg-white pl-11 text-base shadow-lg"
              />
              {showSearchDropdown && q.length >= 2 && searchData && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border bg-white shadow-xl scrollbar-thin">
                  {searchData.suggestions?.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No results found</p>
                  ) : (
                    searchData.suggestions?.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (s.type === "lab" && s.slug) window.location.href = `/?marketplace=lab&slug=${s.slug}`
                          else if (s.labSlug) window.location.href = `/?marketplace=lab&slug=${s.labSlug}`
                          else setQ(s.label)
                          setShowSearchDropdown(false)
                        }}
                        className="flex w-full items-center gap-3 border-b px-4 py-2.5 text-left last:border-0 hover:bg-muted/50"
                      >
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold", s.type === "lab" ? "bg-blue-100 text-blue-600" : s.type === "test" ? "bg-emerald-100 text-emerald-600" : s.type === "profile" ? "bg-violet-100 text-violet-600" : "bg-amber-100 text-amber-600")}>
                          {s.type === "lab" ? "🏥" : s.type === "test" ? "🔬" : s.type === "profile" ? "📋" : "📦"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.sublabel}{s.lab && ` · ${s.lab}`}</p>
                        </div>
                        {s.rating && <Badge variant="outline" className="text-[10px]">{s.rating}★</Badge>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-12 border-0 bg-white text-base shadow-lg sm:w-44">
                <MapPin className="mr-1.5 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Cities</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="lg" className="h-12 bg-white text-emerald-700 hover:bg-emerald-50" onClick={detectLocation}>
              <Navigation className="mr-1.5 h-4 w-4" /> Near me
            </Button>
          </div>

          {/* Category quick-links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: "Full Body Checkup", q: "Full Body", icon: "🏥" },
              { label: "Diabetes", q: "Diabetes", icon: "🩸" },
              { label: "Thyroid", q: "Thyroid", icon: "🦋" },
              { label: "Heart Care", q: "Heart", icon: "❤️" },
              { label: "Women's Health", q: "Women", icon: "👩" },
              { label: "Vitamin D", q: "Vitamin D", icon: "☀️" },
              { label: "CBC", q: "CBC", icon: "🔬" },
              { label: "Lipid Profile", q: "Lipid", icon: "🧪" },
            ].map((cat) => (
              <button
                key={cat.label}
                onClick={() => setQ(cat.q)}
                className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:bg-white/25"
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 scrollbar-thin">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-36 shrink-0 text-xs"><TrendingUp className="mr-1 h-3 w-3" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="distance">Nearest</SelectItem>
              <SelectItem value="orders">Most Popular</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          <FilterChip active={nablOnly} onClick={() => setNablOnly(!nablOnly)} icon={ShieldCheck}>NABL Certified</FilterChip>
          <FilterChip active={homeCollectionOnly} onClick={() => setHomeCollectionOnly(!homeCollectionOnly)} icon={Home}>Home Collection</FilterChip>
          <FilterChip active={openNow} onClick={() => setOpenNow(!openNow)} icon={Clock}>Open Now</FilterChip>
          <FilterChip active={featuredOnly} onClick={() => setFeaturedOnly(!featuredOnly)} icon={Award}>Featured</FilterChip>
          {userLocation && (
            <Badge variant="outline" className="shrink-0 gap-1 text-xs">
              <MapPin className="h-3 w-3" /> {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}
              <button onClick={() => setUserLocation(null)}><X className="h-3 w-3" /></button>
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setNablOnly(false); setHomeCollectionOnly(false); setOpenNow(false); setFeaturedOnly(false); setUserLocation(null) }}>
                Clear ({activeFilterCount})
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowMap(!showMap)}>
              {showMap ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn("mx-auto max-w-7xl gap-4 px-4 py-6", showMap && "grid lg:grid-cols-[1fr_400px]")}>
        {/* Lab list */}
        <div className={cn(showMap && "lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto scrollbar-thin pr-1")}>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <LabCardSkeleton key={i} />)}</div>
          ) : labs.length === 0 ? (
            <Card className="p-12 text-center">
              <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No labs found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </Card>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">{labs.length} labs found{city !== "ALL" && ` in ${city}`}</p>
              <div className="space-y-3">
                {labs.map((lab, idx) => (
                  <LabCard key={lab.id} lab={lab} rank={idx + 1} onSelect={() => window.location.href = `/?marketplace=lab&slug=${lab.slug}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Map panel */}
        {showMap && (
          <div className="sticky top-[140px] hidden lg:block">
            <Card className="overflow-hidden p-0">
              <div className="h-[calc(100vh-180px)]">
                <OpenStreetMap labs={labs} userLocation={userLocation} />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row">
          <p>LabFinder · MediCore LMS Marketplace · {labs.length} labs across {cities.length} cities</p>
          <p>Powered by OpenStreetMap</p>
        </div>
      </footer>
    </div>
  )
}

function FilterChip({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card hover:bg-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  )
}

function LabCard({ lab, rank, onSelect }: { lab: any; rank: number; onSelect: () => void }) {
  const distance = lab.distance
  const isOpen = lab.open24x7 || (lab.openTime && lab.closeTime ? (() => {
    const now = new Date()
    const cur = now.getHours() * 100 + now.getMinutes()
    return cur >= parseInt(lab.openTime.replace(":", "")) && cur <= parseInt(lab.closeTime.replace(":", ""))
  })() : false)

  return (
    <Card className="group cursor-pointer overflow-hidden p-0 transition-all hover:shadow-lg hover:ring-1 hover:ring-primary/20" onClick={onSelect}>
      <div className="flex">
        {/* Cover image */}
        <div className="relative h-32 w-32 shrink-0 bg-gradient-to-br from-emerald-500/30 to-teal-600/30 sm:h-36 sm:w-44">
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl font-bold text-white/80">{lab.displayName.slice(0, 2).toUpperCase()}</span>
          </div>
          {rank <= 3 && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <Award className="h-2.5 w-2.5" /> #{rank}
            </div>
          )}
          {lab.featured && (
            <div className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              ⭐ Featured
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate font-semibold group-hover:text-primary">{lab.displayName}</h3>
                {lab.verified && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {lab.address}
                {distance != null && <span className="ml-1 font-semibold text-foreground">{distance.toFixed(1)} km away</span>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold text-white", lab.rating >= 4.5 ? "bg-emerald-500" : lab.rating >= 4 ? "bg-emerald-600" : lab.rating >= 3 ? "bg-amber-500" : "bg-rose-500")}>
                {lab.rating} <Star className="h-3 w-3 fill-white" />
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{lab.reviewCount} reviews</p>
            </div>
          </div>

          {lab.description && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{lab.description}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {lab.nablCertified && <Badge variant="secondary" className="gap-1 bg-emerald-50 text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"><ShieldCheck className="h-2.5 w-2.5" /> NABL</Badge>}
            {lab.homeCollection && <Badge variant="secondary" className="gap-1 text-[10px]"><Home className="h-2.5 w-2.5" /> {lab.homeCollectionFee > 0 ? `₹${lab.homeCollectionFee}` : "FREE Home"}</Badge>}
            {lab.open24x7 ? <Badge variant="secondary" className="gap-1 bg-violet-50 text-[10px] text-violet-700 dark:bg-violet-950 dark:text-violet-400"><Clock className="h-2.5 w-2.5" /> 24×7</Badge> : isOpen ? <Badge variant="secondary" className="gap-1 bg-emerald-50 text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"><Clock className="h-2.5 w-2.5" /> Open</Badge> : <Badge variant="secondary" className="gap-1 bg-rose-50 text-[10px] text-rose-700 dark:bg-rose-950 dark:text-rose-400"><Clock className="h-2.5 w-2.5" /> Closed</Badge>}
            {lab.orderCount > 0 && <Badge variant="outline" className="text-[10px]">{lab.orderCount} orders</Badge>}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {lab.parking && <span title="Parking">🅿️</span>}
              {lab.wheelchairAccess && <span title="Wheelchair Access">♿</span>}
              {lab.emergencyService && <span title="Emergency">🚨</span>}
            </div>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={(e) => { e.stopPropagation(); onSelect() }}>
              View Details <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function LabCardSkeleton() {
  return (
    <Card className="flex overflow-hidden p-0">
      <div className="h-32 w-32 shrink-0 animate-pulse bg-muted sm:h-36 sm:w-44" />
      <div className="flex-1 p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-3 flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-3 h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </Card>
  )
}

function OpenStreetMap({ labs, userLocation }: { labs: any[]; userLocation: { lat: number; lng: number } | null }) {
  const center = userLocation || { lat: 12.9756, lng: 77.6066 }
  const delta = 0.15
  const bbox = `${center.lng - delta},${center.lat - delta},${center.lng + delta},${center.lat + delta}`
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`

  return (
    <div className="relative h-full w-full">
      <iframe src={mapUrl} className="h-full w-full border-0" title="OpenStreetMap" loading="lazy" />
      <div className="absolute bottom-3 left-3 right-3 max-h-40 overflow-y-auto rounded-lg border bg-background/95 p-2 backdrop-blur scrollbar-thin">
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">{labs.length} labs on map · {labs.filter(l => l.distance != null).length} nearby</p>
        <div className="space-y-0.5">
          {labs.filter((l) => l.latitude && l.longitude).slice(0, 10).map((l) => (
            <a key={l.id} href={`/?marketplace=lab&slug=${l.slug}`} className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{l.displayName}</span>
              <span className="ml-auto shrink-0 font-medium text-amber-500">{l.rating}★</span>
              {l.distance != null && <span className="shrink-0 text-muted-foreground">{l.distance.toFixed(1)}km</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
