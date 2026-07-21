"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Search, Star, Clock, ShieldCheck, Home, Navigation, CheckCircle2, Loader2, MapIcon, List, X } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function MarketplaceDiscoverView() {
  const qc = useQueryClient()
  const [q, setQ] = useState("")
  const [sort, setSort] = useState("rating")
  const [nablOnly, setNablOnly] = useState(false)
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedLab, setSelectedLab] = useState<string | null>(null)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-labs", q, sort, nablOnly, homeCollectionOnly, userLocation],
    queryFn: () => {
      const params = new URLSearchParams({ sort, nabl: String(nablOnly), homeCollection: String(homeCollectionOnly) })
      if (q) params.set("q", q)
      if (userLocation) { params.set("lat", String(userLocation.lat)); params.set("lng", String(userLocation.lng)); params.set("radius", "50") }
      return api.get<{ labs: any[] }>(`/api/marketplace/labs?${params}`)
    },
  })

  const addToCart = useMutation({
    mutationFn: (payload: any) => api.post("/api/marketplace/cart", payload),
    onSuccess: () => { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["marketplace-cart", sessionId] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success("Location detected") },
      () => { toast.error("Could not detect location. Using default Bengaluru."); setUserLocation({ lat: 12.9756, lng: 77.6066 }) }
    )
  }

  const labs = data?.labs ?? []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="font-bold">LabFinder</span>
          </div>
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search labs, tests, packages, or city…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={detectLocation}>
            <Navigation className="mr-1.5 h-3.5 w-3.5" /> Near me
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)}>
            {showMap ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.href = "/"}>
            Staff Login
          </Button>
        </div>
        {/* Filter bar */}
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-3">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="distance">Nearest</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
          <FilterChip active={nablOnly} onClick={() => setNablOnly(!nablOnly)} icon={ShieldCheck}>NABL Certified</FilterChip>
          <FilterChip active={homeCollectionOnly} onClick={() => setHomeCollectionOnly(!homeCollectionOnly)} icon={Home}>Home Collection</FilterChip>
          {userLocation && (
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" /> {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}
              <button onClick={() => setUserLocation(null)}><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
      </header>

      <div className={cn("mx-auto max-w-7xl gap-4 px-4 py-4", showMap ? "grid lg:grid-cols-2" : "block")}>
        {/* Lab list */}
        <div className={cn(showMap && "lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto scrollbar-thin")}>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : labs.length === 0 ? (
            <EmptyState icon={Search} title="No labs found" description="Try adjusting your search or filters." />
          ) : (
            <div className="space-y-3">
              {labs.map((lab) => (
                <LabCard key={lab.id} lab={lab} onSelect={() => window.location.href = `/?marketplace=lab&slug=${lab.slug}`} />
              ))}
            </div>
          )}
        </div>

        {/* Map panel */}
        {showMap && (
          <div className="sticky top-[140px] hidden lg:block">
            <Card className="overflow-hidden p-0">
              <div className="h-[calc(100vh-180px)]">
                <OpenStreetMap labs={labs} userLocation={userLocation} selectedLab={selectedLab} onSelect={setSelectedLab} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  )
}

function LabCard({ lab, onSelect }: { lab: any; onSelect: () => void }) {
  const distance = (lab as any).distance
  return (
    <Card className="overflow-hidden p-0 transition-all hover:shadow-md">
      <div className="flex">
        {/* Cover */}
        <div className="relative h-32 w-32 shrink-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 sm:h-36 sm:w-44">
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl font-bold text-emerald-600/30">{lab.displayName.slice(0, 2).toUpperCase()}</span>
          </div>
          {lab.featured && <Badge className="absolute left-2 top-2 gap-1 bg-amber-500 text-white text-[10px]"><Star className="h-2.5 w-2.5" /> Featured</Badge>}
          {lab.nablCertified && <Badge className="absolute right-2 top-2 gap-1 bg-emerald-600 text-white text-[10px]"><ShieldCheck className="h-2.5 w-2.5" /> NABL</Badge>}
        </div>
        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold hover:text-primary hover:underline" onClick={onSelect}>{lab.displayName}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {lab.address}, {lab.city}
                {distance != null && <span className="ml-1 font-medium text-foreground">· {distance.toFixed(1)} km</span>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold">{lab.rating}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{lab.reviewCount} reviews</p>
            </div>
          </div>

          {lab.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{lab.description}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {lab.homeCollection && <Badge variant="secondary" className="gap-1 text-[10px]"><Home className="h-2.5 w-2.5" /> Home Collection {lab.homeCollectionFee > 0 ? `₹${lab.homeCollectionFee}` : "FREE"}</Badge>}
            {lab.open24x7 ? <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-2.5 w-2.5" /> 24×7</Badge> : lab.openTime && <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-2.5 w-2.5" /> {lab.openTime}–{lab.closeTime}</Badge>}
            {lab.verified && <Badge variant="secondary" className="gap-1 text-[10px] text-emerald-600"><CheckCircle2 className="h-2.5 w-2.5" /> Verified</Badge>}
            {lab.parking && <Badge variant="outline" className="text-[10px]">Parking</Badge>}
            {lab.wheelchairAccess && <Badge variant="outline" className="text-[10px]">Wheelchair</Badge>}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onSelect}>View Details</Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function OpenStreetMap({ labs, userLocation, selectedLab, onSelect }: { labs: any[]; userLocation: { lat: number; lng: number } | null; selectedLab: string | null; onSelect: (id: string) => void }) {
  // Use OpenStreetMap embed with bbox around the labs
  const center = userLocation || { lat: 12.9756, lng: 77.6066 }
  const delta = 0.15
  const bbox = `${center.lng - delta},${center.lat - delta},${center.lng + delta},${center.lat + delta}`
  const marker = labs.map((l) => l.latitude && l.longitude ? `${l.longitude},${l.latitude}` : null).filter(Boolean).join(",")
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`

  return (
    <div className="relative h-full w-full">
      <iframe
        src={mapUrl}
        className="h-full w-full border-0"
        title="OpenStreetMap"
        loading="lazy"
      />
      {/* Overlay: lab pins list */}
      <div className="absolute bottom-3 left-3 right-3 max-h-32 overflow-y-auto rounded-lg border bg-background/90 p-2 backdrop-blur scrollbar-thin">
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">{labs.length} labs on map</p>
        <div className="space-y-0.5">
          {labs.filter((l) => l.latitude && l.longitude).slice(0, 8).map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l.id)}
              className={cn("flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted", selectedLab === l.id && "bg-muted")}
            >
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{l.displayName}</span>
              {l.distance != null && <span className="ml-auto text-muted-foreground">{l.distance.toFixed(1)}km</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
