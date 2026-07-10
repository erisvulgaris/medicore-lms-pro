"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserPlus, Loader2, Search, CheckCircle2, Zap } from "lucide-react"
import { formatCurrency, initials } from "@/lib/format"
import { GENDERS, BLOOD_GROUPS, PRIORITY } from "@/lib/constants"
import { toast } from "sonner"

export function ExpressRegisterDialog() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [patientQ, setPatientQ] = useState("")
  const [existingPatient, setExistingPatient] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", gender: "Male", age: "", bloodGroup: "", email: "", address: "",
  })
  const [testQ, setTestQ] = useState("")
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [doctorId, setDoctorId] = useState("")
  const [priority, setPriority] = useState("ROUTINE")
  const [collectNow, setCollectNow] = useState(true)
  const [payNow, setPayNow] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: patientsData } = useQuery({
    queryKey: ["patients-express", patientQ],
    queryFn: () => api.get<{ patients: any[] }>(`/api/patients?q=${encodeURIComponent(patientQ)}`),
    enabled: step === 0 && patientQ.length > 1,
  })
  const { data: testsData } = useQuery({ queryKey: ["tests-express"], queryFn: () => api.get<{ tests: any[] }>("/api/tests") })
  const { data: doctorsData } = useQuery({ queryKey: ["doctors-express"], queryFn: () => api.get<{ doctors: any[] }>("/api/doctors") })
  const { data: profilesData } = useQuery({ queryKey: ["profiles-express"], queryFn: () => api.get<{ profiles: any[]; packages: any[] }>("/api/profiles") })

  const tests = testsData?.tests ?? []
  const selectedTestObjs = tests.filter((t) => selectedTests.includes(t.id))
  const subtotal = selectedTestObjs.reduce((s, t) => s + t.price, 0)

  const toggleTest = (id: string) => setSelectedTests((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const addProfile = (profile: any) => {
    const ids = profile.items.map((i: any) => i.testId)
    setSelectedTests((p) => Array.from(new Set([...p, ...ids])))
    toast.success(`Added ${profile.name}`)
  }

  const reset = () => {
    setStep(0); setPatientQ(""); setExistingPatient(null); setForm({ firstName: "", lastName: "", phone: "", gender: "Male", age: "", bloodGroup: "", email: "", address: "" })
    setTestQ(""); setSelectedTests([]); setDoctorId(""); setPriority("ROUTINE"); setCollectNow(true); setPayNow(false)
  }

  const submit = async () => {
    if (selectedTests.length === 0) { toast.error("Select at least one test"); setStep(1); return }
    setSaving(true)
    try {
      let payload: any = { testIds: selectedTests, doctorId: doctorId || undefined, priority, collectNow, payNow }
      if (existingPatient) {
        // use existing patient
        payload.existingPatientId = existingPatient
      } else {
        if (!form.firstName || !form.lastName) { toast.error("Patient name required"); setStep(0); setSaving(false); return }
        payload.patient = { ...form, age: form.age ? Number(form.age) : null }
      }
      const res = await api.post("/api/express-register", payload)
      toast.success(`${res.order.orderCode} created for ${res.patient.name} — ${res.invoice.status}`)
      qc.invalidateQueries({ queryKey: ["quick-lab"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["patients"] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setOpen(false)
      reset()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button><Zap className="mr-2 h-4 w-4" /> Express Register</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Express Registration</DialogTitle>
          <p className="text-sm text-muted-foreground">Patient + tests + sample + payment in one step</p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-1">
          {["Patient", "Tests", "Review"].map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold", i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</div>
              <span className={cn("text-xs font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3 py-1">
            {/* Search existing patient */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search existing patient by phone/name (or fill new below)…" value={patientQ} onChange={(e) => setPatientQ(e.target.value)} className="pl-9" />
            </div>
            {patientsData && patientsData.patients.length > 0 && (
              <ScrollArea className="h-32 rounded-lg border">
                <div className="divide-y">
                  {patientsData.patients.map((p) => (
                    <button key={p.id} onClick={() => { setExistingPatient(p.id); setStep(1) }} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{initials(`${p.firstName} ${p.lastName}`)}</div>
                      <span className="text-sm font-medium">{p.firstName} {p.lastName}</span>
                      <span className="text-xs text-muted-foreground">{p.patientCode} · {p.phone}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Or register new patient:</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="mb-1 block text-xs">First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" /></div>
                <div><Label className="mb-1 block text-xs">Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label className="mb-1 block text-xs">Blood Group</Label>
                  <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!form.firstName && !existingPatient}>Continue →</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 py-1">
            {/* Quick profiles */}
            {profilesData && profilesData.profiles.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Quick add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {profilesData.profiles.map((p) => <button key={p.id} onClick={() => addProfile(p)} className="rounded-full border bg-card px-3 py-1 text-xs font-medium hover:border-primary hover:bg-accent">{p.name} · ₹{p.price}</button>)}
                  {profilesData.packages.map((p) => <button key={p.id} onClick={() => addProfile(p)} className="rounded-full border bg-card px-3 py-1 text-xs font-medium hover:border-primary hover:bg-accent">{p.name} · ₹{p.price}</button>)}
                </div>
              </div>
            )}

            <Input placeholder="Search tests…" value={testQ} onChange={(e) => setTestQ(e.target.value)} />

            <ScrollArea className="h-48 rounded-lg border">
              <div className="divide-y">
                {tests.filter((t) => !testQ || t.name.toLowerCase().includes(testQ.toLowerCase()) || t.code.toLowerCase().includes(testQ.toLowerCase())).map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/40">
                    <Checkbox checked={selectedTests.includes(t.id)} onCheckedChange={() => toggleTest(t.id)} />
                    <span className="flex-1 text-sm">{t.name} <span className="font-mono text-xs text-muted-foreground">{t.code}</span></span>
                    <span className="text-sm font-medium">{formatCurrency(t.price)}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)} disabled={selectedTests.length === 0}>Continue →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label className="mb-1 block text-xs">Referring Doctor</Label>
                <Select value={doctorId} onValueChange={setDoctorId}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent>{(doctorsData?.doctors ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label className="mb-1 block text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={collectNow} onCheckedChange={(v) => setCollectNow(!!v)} /> Collect sample now (mark as received)</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={payNow} onCheckedChange={(v) => setPayNow(!!v)} /> Mark as paid (cash)</label>
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-3 py-2 text-sm font-medium">Summary</div>
              <div className="divide-y">
                {selectedTestObjs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-1.5 text-sm"><span>{t.name}</span><span>{formatCurrency(t.price)}</span></div>
                ))}
              </div>
              <div className="flex justify-between border-t px-3 py-2 text-base font-bold"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Order</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

