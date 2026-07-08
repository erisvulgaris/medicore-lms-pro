"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Save,
  Loader2,
  FileText,
  CreditCard,
  Bell,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Hash,
  Mailbox,
  MessageSquare,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Org = {
  id: string
  name: string
  legalName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  gstin: string | null
  accentColor: string | null
}

type Branch = {
  id: string
  name: string
  code: string
  city: string | null
  phone: string | null
  isHeadOffice: boolean
}

type SettingsResponse = {
  settings: Record<string, string>
  organization: Org | null
  branches: Branch[]
}

const ACCENT_COLORS = ["emerald", "teal", "blue", "violet", "rose"] as const

const COLOR_SWATCH: Record<string, string> = {
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
}

export function SettingsView() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SettingsResponse>(`/api/settings`),
  })

  const [org, setOrg] = useState<Org | null>(null)
  const [reportFooter, setReportFooter] = useState("")
  const [verificationUrl, setVerificationUrl] = useState("")
  const [gstEnabled, setGstEnabled] = useState(false)
  const [prevData, setPrevData] = useState<SettingsResponse | null>(null)

  // Initialize local form state from fetched data (render-time sync, no effect)
  if (data && data !== prevData) {
    setPrevData(data)
    setOrg(data.organization ?? null)
    setReportFooter(data.settings["report.footer"] ?? "")
    setVerificationUrl(data.settings["verification.baseUrl"] ?? "")
    setGstEnabled(data.settings["billing.gstEnabled"] === "true")
  }

  const hydrated = prevData !== null

  const orgMutation = useMutation({
    mutationFn: (body: { organization: Partial<Org> }) => api.put(`/api/settings`, body),
    onSuccess: () => {
      toast.success("Organization updated")
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const settingsMutation = useMutation({
    mutationFn: (body: { settings: Record<string, string> }) => api.put(`/api/settings`, body),
    onSuccess: () => {
      toast.success("Settings saved")
      qc.invalidateQueries({ queryKey: ["settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !hydrated) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" subtitle="Organization configuration and preferences" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const branches = data?.branches ?? []
  const verificationDisplay = verificationUrl || (typeof window !== "undefined" ? `${window.location.origin}/verify/` : "/verify/")

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Organization configuration and preferences" />

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Organization</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="mr-1.5 h-3.5 w-3.5" /> Report Templates</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="mr-1.5 h-3.5 w-3.5" /> Billing</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications</TabsTrigger>
        </TabsList>

        {/* Organization tab */}
        <TabsContent value="org" className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Organization profile</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">Primary identity used across reports and invoices.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><Input value={org?.name ?? ""} onChange={(e) => setOrg({ ...(org as Org), name: e.target.value })} /></Field>
              <Field label="Legal name"><Input value={org?.legalName ?? ""} onChange={(e) => setOrg({ ...(org as Org), legalName: e.target.value })} placeholder="Official registered name" /></Field>
              <Field label="Email"><Input type="email" value={org?.email ?? ""} onChange={(e) => setOrg({ ...(org as Org), email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={org?.phone ?? ""} onChange={(e) => setOrg({ ...(org as Org), phone: e.target.value })} /></Field>
              <Field label="Address" full><Input value={org?.address ?? ""} onChange={(e) => setOrg({ ...(org as Org), address: e.target.value })} /></Field>
              <Field label="City"><Input value={org?.city ?? ""} onChange={(e) => setOrg({ ...(org as Org), city: e.target.value })} /></Field>
              <Field label="State"><Input value={org?.state ?? ""} onChange={(e) => setOrg({ ...(org as Org), state: e.target.value })} /></Field>
              <Field label="GSTIN"><Input value={org?.gstin ?? ""} onChange={(e) => setOrg({ ...(org as Org), gstin: e.target.value })} className="font-mono" /></Field>
              <Field label="Accent color">
                <Select value={org?.accentColor ?? "emerald"} onValueChange={(v) => setOrg({ ...(org as Org), accentColor: v })}>
                  <SelectTrigger>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-full", COLOR_SWATCH[org?.accentColor ?? "emerald"])} />
                      <span className="capitalize">{org?.accentColor ?? "emerald"}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_COLORS.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-3 w-3 rounded-full", COLOR_SWATCH[c])} />
                          <span className="capitalize">{c}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => orgMutation.mutate({ organization: org as Org })} disabled={orgMutation.isPending}>
                {orgMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save organization
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4">
              <h3 className="font-semibold">Branches</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{branches.length} branches · managed via administration</p>
            </div>
            {branches.length === 0 ? (
              <EmptyState icon={Building2} title="No branches" description="Branches are added during organization setup." />
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                      <th className="px-3 py-2 text-left font-medium">City</th>
                      <th className="px-3 py-2 text-left font-medium">Phone</th>
                      <th className="px-3 py-2 text-right font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {branches.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{b.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{b.code}</td>
                        <td className="px-3 py-2 text-muted-foreground">{b.city ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{b.phone ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          {b.isHeadOffice ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Head office</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Branch</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Report Templates tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="font-semibold">Report templates</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Customize how reports render and verify.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Report footer text</Label>
                <Textarea
                  rows={3}
                  value={reportFooter}
                  onChange={(e) => setReportFooter(e.target.value)}
                  placeholder="e.g. This report is computer-generated and does not require a physical signature."
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Appears at the bottom of every issued report.</p>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Verification base URL (read-only)</Label>
                <Input value={verificationDisplay} readOnly className="bg-muted/40 font-mono text-xs text-muted-foreground" />
                <p className="mt-1 text-[11px] text-muted-foreground">Reports include a QR code linking to <span className="font-mono">{verificationDisplay}&lt;token&gt;</span>.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => settingsMutation.mutate({ settings: { "report.footer": reportFooter } })}
                disabled={settingsMutation.isPending}
              >
                {settingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save templates
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Billing tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="font-semibold">Billing configuration</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Tax and invoice behavior.</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable GST on invoices</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">When enabled, GST will be applied based on per-test gstRate values.</p>
              </div>
              <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={() => settingsMutation.mutate({ settings: { "billing.gstEnabled": String(gstEnabled) } })}
                disabled={settingsMutation.isPending}
              >
                {settingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save billing
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Notification channels</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure email, SMS, and WhatsApp providers here. In-app notifications are active.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ChannelCard icon={Mailbox} label="Email" status="Pending config" tone="amber" />
                  <ChannelCard icon={MessageSquare} label="SMS" status="Pending config" tone="amber" />
                  <ChannelCard icon={MessageSquare} label="WhatsApp" status="Pending config" tone="amber" />
                  <ChannelCard icon={Bell} label="In-app" status="Active" tone="emerald" />
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Provider credentials (SMTP, DLT-approved SMS gateways, WhatsApp Business API) are configured via environment variables on the server. Contact your administrator to enable outbound channels.</span>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ChannelCard({ icon: Icon, label, status, tone }: { icon: typeof Bell; label: string; status: string; tone: "emerald" | "amber" }) {
  return (
    <div className="rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            tone === "emerald" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          )}
        >
          <ShieldCheck className="h-2.5 w-2.5" /> {status}
        </span>
      </div>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
