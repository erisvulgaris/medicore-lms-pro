"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Search, Plus, Phone, MapPin, Building2, UserPlus, Loader2 } from "lucide-react"
import { initials, formatDate, calcAge } from "@/lib/format"
import { GENDERS, BLOOD_GROUPS } from "@/lib/constants"
import { toast } from "sonner"

export function PatientsView() {
  const { navigate, can, viewParam } = useApp()
  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(viewParam === "new")

  const { data, isLoading } = useQuery({
    queryKey: ["patients", q],
    queryFn: () => api.get<{ patients: any[]; total: number }>(`/api/patients?q=${encodeURIComponent(q)}`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        subtitle={`${data?.total ?? 0} registered patients`}
        actions={
          can("patients.write") && (
            <CreatePatientDialog open={createOpen} onOpenChange={setCreateOpen} />
          )
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or patient code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : !data?.patients.length ? (
          <EmptyState icon={Users} title="No patients found" description="Try a different search or register a new patient." action={can("patients.write") && <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Register Patient</Button>} />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {data.patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate("patient-detail", p.id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials(`${p.firstName} ${p.lastName}`)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{p.firstName} {p.lastName}</p>
                      <Badge variant="outline" className="text-[10px] font-mono">{p.patientCode}</Badge>
                      {p.isCorporate && <Badge variant="secondary" className="gap-1 text-[10px]"><Building2 className="h-2.5 w-2.5" /> Corporate</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{p.gender ?? "—"} · {p.age ?? calcAge(p.dob) ?? "—"} yrs</span>
                      {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</span>}
                      {p.bloodGroup && <span>Blood: {p.bloodGroup}</span>}
                      {p.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</span>}
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted-foreground">Registered</p>
                    <p className="text-xs font-medium">{formatDate(p.createdAt)}</p>
                  </div>
                  <div className="hidden items-center gap-3 md:flex">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Orders</p>
                      <p className="text-sm font-semibold">{p._count.orders}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Invoices</p>
                      <p className="text-sm font-semibold">{p._count.invoices}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function CreatePatientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    firstName: "", lastName: "", dob: "", gender: "Male", phone: "", email: "", address: "", city: "Bengaluru", state: "Karnataka", bloodGroup: "", emergencyContact: "", medicalHistory: "", allergies: "", isCorporate: false, corporateName: "",
  })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.firstName || !form.lastName) { toast.error("First and last name are required"); return }
    setSaving(true)
    try {
      const patient = await api.post("/api/patients", { ...form, age: form.dob ? calcAge(form.dob) : null })
      toast.success(`Patient ${patient.patientCode} registered`)
      qc.invalidateQueries({ queryKey: ["patients"] })
      onOpenChange(false)
      setForm({ firstName: "", lastName: "", dob: "", gender: "Male", phone: "", email: "", address: "", city: "Bengaluru", state: "Karnataka", bloodGroup: "", emergencyContact: "", medicalHistory: "", allergies: "", isCorporate: false, corporateName: "" })
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><UserPlus className="mr-2 h-4 w-4" /> Register Patient</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="First Name *"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Rajesh" /></Field>
          <Field label="Last Name *"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Sharma" /></Field>
          <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rajesh@example.com" /></Field>
          <Field label="Blood Group">
            <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Emergency Contact"><Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} /></Field>
          <Field label="Address" full><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Medical History" full><Input value={form.medicalHistory} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} placeholder="Diabetes, Hypertension…" /></Field>
          <Field label="Allergies" full><Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, etc." /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Register Patient</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
