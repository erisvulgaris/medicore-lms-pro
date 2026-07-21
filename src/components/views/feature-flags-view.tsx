"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, ToggleLeft, ToggleRight, ShieldCheck, Zap } from "lucide-react"
import { formatDate } from "@/lib/format"
import { toast } from "sonner"

export function FeatureFlagsView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => api.get<{ flags: any[] }>("/api/feature-flags"),
  })

  const toggle = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => api.patch("/api/feature-flags", { key, enabled }),
    onSuccess: () => { toast.success("Feature flag updated"); qc.invalidateQueries({ queryKey: ["feature-flags"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags"
        subtitle="Control marketplace features instantly — no code changes required"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {data.flags.map((flag) => (
          <Card key={flag.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${flag.enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                {flag.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{flag.label}</p>
                  {flag.enabled ? <Badge className="bg-emerald-500 text-white text-[10px]">ON</Badge> : <Badge variant="outline" className="text-[10px]">OFF</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{flag.description}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/70 font-mono">{flag.key}</p>
              </div>
            </div>
            <Switch checked={flag.enabled} onCheckedChange={(v) => toggle.mutate({ key: flag.key, enabled: v })} disabled={toggle.isPending} />
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">How Feature Flags Work</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Feature flags allow the Super Admin to enable or disable marketplace features instantly without code changes or deployment.
          When a feature is disabled, all related routes, APIs, and navigation are hidden. Changes take effect immediately.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-emerald-600">Marketplace ON</p>
            <p className="mt-1 text-xs text-muted-foreground">Public lab discovery, search, cart, and ordering are available at <code className="rounded bg-muted px-1">/?marketplace=1</code></p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-rose-600">Marketplace OFF</p>
            <p className="mt-1 text-xs text-muted-foreground">All marketplace APIs return 403, public routes hidden, only the staff LMS remains accessible.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
