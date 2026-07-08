"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  FlaskConical, Search, TestTube2, Package, Layers, Clock, Beaker, Tag, Percent,
} from "lucide-react"
import { formatCurrency } from "@/lib/format"

// Parse a JSON referenceRanges string into a friendly "low - high unit" string
function parseRefRange(rangesJson: string | null | undefined, unit?: string | null): string {
  if (!rangesJson) return "—"
  try {
    const ranges = JSON.parse(rangesJson)
    if (!Array.isArray(ranges) || ranges.length === 0) return "—"
    const r = ranges[0]
    if (r && typeof r.low === "number" && typeof r.high === "number") {
      return `${r.low} - ${r.high} ${unit || ""}`.trim()
    }
    return "—"
  } catch {
    return "—"
  }
}

export function TestsView() {
  const [q, setQ] = useState("")
  const [categoryId, setCategoryId] = useState<string>("ALL")
  const [tab, setTab] = useState("tests")

  const { data: testsData, isLoading: testsLoading } = useQuery({
    queryKey: ["tests", q, categoryId],
    queryFn: () =>
      api.get<{ tests: any[]; categories: any[] }>(
        `/api/tests?q=${encodeURIComponent(q)}${categoryId !== "ALL" ? `&category=${categoryId}` : ""}`,
      ),
  })
  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => api.get<{ profiles: any[]; packages: any[] }>("/api/profiles"),
  })

  const tests = testsData?.tests ?? []
  const categories = testsData?.categories ?? []
  const profiles = profilesData?.profiles ?? []
  const packages = profilesData?.packages ?? []

  // Group tests by department for display
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const t of tests) {
      const dept = t.department || "Uncategorized"
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(t)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [tests])

  const profileFilter = (item: any) =>
    !q ||
    item.name?.toLowerCase().includes(q.toLowerCase()) ||
    item.code?.toLowerCase().includes(q.toLowerCase())

  return (
    <div className="space-y-6">
      <PageHeader title="Test Catalog" subtitle="Tests, profiles, and packages" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tests" className="gap-1.5">
            <TestTube2 className="h-3.5 w-3.5" /> Tests
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{tests.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Profiles
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{profiles.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="packages" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Packages
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{packages.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* TESTS TAB */}
        {tab === "tests" && (
          <Card className="mt-4 overflow-hidden">
            {testsLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : tests.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="No tests found"
                description="Try a different search term or category."
              />
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-6 p-4">
                  {grouped.map(([dept, list]) => (
                    <div key={dept}>
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <FlaskConical className="h-3.5 w-3.5 text-primary" />
                        <h3 className="text-sm font-semibold tracking-tight">{dept}</h3>
                        <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                        <Separator className="ml-2 flex-1" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {list.map((t) => (
                          <TestCard key={t.id} test={t} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        )}

        {/* PROFILES TAB */}
        {tab === "profiles" && (
          <Card className="mt-4 overflow-hidden">
            {profilesLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : profiles.filter(profileFilter).length === 0 ? (
              <EmptyState icon={Layers} title="No profiles found" description="Profiles bundle related tests at a combined price." />
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {profiles.filter(profileFilter).map((p) => (
                    <ProfileCard key={p.id} profile={p} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        )}

        {/* PACKAGES TAB */}
        {tab === "packages" && (
          <Card className="mt-4 overflow-hidden">
            {profilesLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : packages.filter(profileFilter).length === 0 ? (
              <EmptyState icon={Package} title="No packages found" description="Packages are health-check bundles offered at a discount." />
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {packages.filter(profileFilter).map((p) => (
                    <PackageCard key={p.id} pkg={p} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        )}
      </Tabs>
    </div>
  )
}

function TestCard({ test }: { test: any }) {
  const refText = parseRefRange(test.referenceRanges, test.unit)
  return (
    <div className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{test.name}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">{test.code}</Badge>
            {test.shortName && <Badge variant="secondary" className="text-[10px]">{test.shortName}</Badge>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary">{formatCurrency(test.price)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Meta icon={Beaker} label="Sample" value={test.sampleType || "—"} />
        <Meta icon={TestTube2} label="Tube" value={test.tubeType || "—"} />
        <Meta icon={Clock} label="TAT" value={`${test.tatHours ?? 24}h`} />
        <Meta icon={Tag} label="Unit" value={test.unit || "—"} />
      </div>

      <div className="mt-3 rounded-md bg-muted/60 px-2.5 py-1.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reference range</p>
        <p className="font-mono text-xs">{refText}</p>
      </div>
    </div>
  )
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  )
}

function ProfileCard({ profile }: { profile: any }) {
  return (
    <div className="group flex flex-col rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <p className="truncate font-medium">{profile.name}</p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">{profile.code}</Badge>
            <Badge variant="secondary" className="text-[10px]">{profile.items?.length ?? 0} tests</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary">{formatCurrency(profile.price)}</p>
        </div>
      </div>
      {profile.description && <p className="mt-2 text-xs text-muted-foreground">{profile.description}</p>}
      <Separator className="my-3" />
      <div className="flex flex-wrap gap-1.5">
        {(profile.items ?? []).slice(0, 8).map((it: any) => (
          <span key={it.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
            {it.test?.shortName || it.test?.name || it.test?.code}
          </span>
        ))}
        {(profile.items ?? []).length > 8 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            +{(profile.items ?? []).length - 8} more
          </span>
        )}
      </div>
    </div>
  )
}

function PackageCard({ pkg }: { pkg: any }) {
  const discount = pkg.mrp && pkg.mrp > pkg.price ? Math.round(((pkg.mrp - pkg.price) / pkg.mrp) * 100) : 0
  return (
    <div className="group flex flex-col rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <p className="truncate font-medium">{pkg.name}</p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">{pkg.code}</Badge>
            <Badge variant="secondary" className="text-[10px]">{pkg.items?.length ?? 0} tests</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary">{formatCurrency(pkg.price)}</p>
          {discount > 0 && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              <span className="line-through">{formatCurrency(pkg.mrp)}</span>
              <span className="rounded bg-emerald-100 px-1 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <Percent className="inline h-2.5 w-2.5" />{discount}%
              </span>
            </p>
          )}
        </div>
      </div>
      {pkg.description && <p className="mt-2 text-xs text-muted-foreground">{pkg.description}</p>}
      <Separator className="my-3" />
      <div className="flex flex-wrap gap-1.5">
        {(pkg.items ?? []).slice(0, 8).map((it: any) => (
          <span key={it.id} className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium ring-1 ring-border">
            {it.test?.shortName || it.test?.name || it.test?.code}
          </span>
        ))}
        {(pkg.items ?? []).length > 8 && (
          <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
            +{(pkg.items ?? []).length - 8} more
          </span>
        )}
      </div>
    </div>
  )
}
