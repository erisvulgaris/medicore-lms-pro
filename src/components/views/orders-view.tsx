"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, Search, Plus, User, TestTube2, Loader2, Stethoscope, Home } from "lucide-react"
import { formatCurrency, formatDateTime, initials } from "@/lib/format"
import { ORDER_STATUS, ORDER_STATUS_FLOW, PRIORITY } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_TABS = ["ALL", "REGISTERED", "COLLECTED", "PROCESSING", "COMPLETED", "VERIFIED", "APPROVED", "DELIVERED"]

export function OrdersView() {
  const { navigate, can, viewParam } = useApp()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")
  const [createOpen, setCreateOpen] = useState(viewParam === "new")

  const { data, isLoading } = useQuery({
    queryKey: ["orders", q, status],
    queryFn: () => api.get<{ orders: any[] }>(`/api/orders?q=${encodeURIComponent(q)}&status=${status}`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Orders"
        subtitle="Manage the full laboratory workflow from registration to delivery"
        actions={can("orders.write") && <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by order code, patient name, or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex h-9 flex-wrap">
            {STATUS_TABS.map((t) => <TabsTrigger key={t} value={t} className="text-xs">{t === "ALL" ? "All" : ORDER_STATUS[t as keyof typeof ORDER_STATUS]?.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : !data?.orders.length ? (
          <EmptyState icon={ClipboardList} title="No orders found" description="Create a new test order to get started." action={can("orders.write") && <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Order</Button>} />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {data.orders.map((o) => {
                const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]
                const pr = PRIORITY[o.priority as keyof typeof PRIORITY]
                const stepIdx = ORDER_STATUS_FLOW.indexOf(o.status as any)
                return (
                  <button key={o.id} onClick={() => navigate("order-detail", o.id)} className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white", st?.color)}>
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{o.patient.firstName} {o.patient.lastName}</p>
                          <Badge variant="outline" className="font-mono text-[10px]">{o.orderCode}</Badge>
                          <Badge variant="outline" className="text-[10px]">{o.patient.patientCode}</Badge>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", pr?.color)}>{pr?.label}</span>
                          {o.isHomeCollection && <Badge variant="secondary" className="gap-1 text-[10px]"><Home className="h-2.5 w-2.5" /> Home</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {o.orderTests.length} test{o.orderTests.length > 1 ? "s" : ""} · {o.orderTests.map((ot: any) => ot.test.shortName || ot.test.code).join(", ")}
                          {o.doctor && ` · Ref: ${o.doctor.name}`}
                        </p>
                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-1">
                          {ORDER_STATUS_FLOW.map((s, i) => (
                            <div key={s} className={cn("h-1 flex-1 rounded-full", i <= stepIdx ? st?.color : "bg-muted")} />
                          ))}
                        </div>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold">{formatCurrency(o.payableAmount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [patientQ, setPatientQ] = useState("")
  const [patientId, setPatientId] = useState<string | null>(null)
  const [testQ, setTestQ] = useState("")
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [doctorId, setDoctorId] = useState("")
  const [priority, setPriority] = useState("ROUTINE")
  const [isHomeCollection, setIsHomeCollection] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [saving, setSaving] = useState(false)

  const { data: patientsData } = useQuery({
    queryKey: ["patients", patientQ],
    queryFn: () => api.get<{ patients: any[] }>(`/api/patients?q=${encodeURIComponent(patientQ)}`),
    enabled: step === 0,
  })
  const { data: testsData } = useQuery({ queryKey: ["tests", testQ], queryFn: () => api.get<{ tests: any[] }>("/api/tests") })
  const { data: profilesData } = useQuery({ queryKey: ["profiles"], queryFn: () => api.get<{ profiles: any[]; packages: any[] }>("/api/profiles") })
  const { data: doctorsData } = useQuery({ queryKey: ["doctors"], queryFn: () => api.get<{ doctors: any[] }>("/api/doctors") })

  const tests = testsData?.tests ?? []
  const selectedTestObjs = tests.filter((t) => selectedTests.includes(t.id))
  const subtotal = selectedTestObjs.reduce((s, t) => s + t.price, 0)
  const discount = Math.round((subtotal * discountPercent) / 100)
  const payable = subtotal - discount

  const toggleTest = (id: string) => setSelectedTests((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const addProfile = (profile: any) => {
    const ids = profile.items.map((i: any) => i.testId)
    setSelectedTests((p) => Array.from(new Set([...p, ...ids])))
    toast.success(`Added ${profile.name} (${ids.length} tests)`)
  }

  const submit = async () => {
    if (!patientId) { toast.error("Select a patient"); setStep(0); return }
    if (selectedTests.length === 0) { toast.error("Select at least one test"); setStep(1); return }
    setSaving(true)
    try {
      await api.post("/api/orders", { patientId, doctorId: doctorId || undefined, testIds: selectedTests, priority, isHomeCollection, discountPercent })
      toast.success("Order created successfully")
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
      onOpenChange(false)
      reset()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep(0); setPatientQ(""); setPatientId(null); setTestQ(""); setSelectedTests([]); setDoctorId(""); setPriority("ROUTINE"); setIsHomeCollection(false); setDiscountPercent(0)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Order</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Test Order</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-2">
          {["Patient", "Tests", "Review"].map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</div>
              <span className={cn("text-sm font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search patient by name, phone, or code…" value={patientQ} onChange={(e) => setPatientQ(e.target.value)} className="pl-9" />
            </div>
            <ScrollArea className="h-64 rounded-lg border">
              <div className="divide-y">
                {(patientsData?.patients ?? []).map((p) => (
                  <button key={p.id} onClick={() => { setPatientId(p.id); setStep(1) }} className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50", patientId === p.id && "bg-primary/5")}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(`${p.firstName} ${p.lastName}`)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.firstName} {p.lastName} <span className="font-mono text-xs text-muted-foreground">{p.patientCode}</span></p>
                      <p className="truncate text-xs text-muted-foreground">{p.gender} · {p.age} yrs · {p.phone || "no phone"}</p>
                    </div>
                  </button>
                ))}
                {(patientsData?.patients ?? []).length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Type to search patients</p>}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">Tip: Register a new patient first from the Patients page if not found.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input placeholder="Search tests…" value={testQ} onChange={(e) => setTestQ(e.target.value)} />
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Referring doctor" /></SelectTrigger>
                <SelectContent>{(doctorsData?.doctors ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Quick profiles */}
            {profilesData && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Quick add profiles & packages</p>
                <div className="flex flex-wrap gap-1.5">
                  {profilesData.profiles.map((p) => <button key={p.id} onClick={() => addProfile(p)} className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-accent">{p.name} · ₹{p.price}</button>)}
                  {profilesData.packages.map((p) => <button key={p.id} onClick={() => addProfile(p)} className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-accent">{p.name} · ₹{p.price}</button>)}
                </div>
              </div>
            )}

            <ScrollArea className="h-56 rounded-lg border">
              <div className="divide-y">
                {tests.filter((t) => !testQ || t.name.toLowerCase().includes(testQ.toLowerCase()) || t.code.toLowerCase().includes(testQ.toLowerCase())).map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
                    <Checkbox checked={selectedTests.includes(t.id)} onCheckedChange={() => toggleTest(t.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.name} <span className="font-mono text-xs text-muted-foreground">{t.code}</span></p>
                      <p className="truncate text-xs text-muted-foreground">{t.department} · {t.sampleType} · TAT {t.tatHours}h</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(t.price)}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Priority">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Discount %">
                <Input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isHomeCollection} onCheckedChange={(v) => setIsHomeCollection(!!v)} /> Home collection requested
            </label>

            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-sm font-medium">Order Summary</div>
              <div className="divide-y">
                {selectedTestObjs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{t.name} <span className="text-xs text-muted-foreground">{t.code}</span></span>
                    <span className="font-medium">{formatCurrency(t.price)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t px-3 py-2 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount ({discountPercent}%)</span><span>-{formatCurrency(discount)}</span></div>}
                <div className="flex justify-between pt-1 text-base font-semibold"><span>Payable</span><span>{formatCurrency(payable)}</span></div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 2 && <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !patientId}>Continue</Button>}
          {step === 2 && <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Order</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>)
}
