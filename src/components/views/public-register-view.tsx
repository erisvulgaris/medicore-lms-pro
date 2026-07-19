"use client"

import { useState } from "react"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { TestTube2, CheckCircle2, Loader2, AlertCircle, Phone, Calendar, User, ArrowLeft } from "lucide-react"
import { GENDERS, BLOOD_GROUPS } from "@/lib/constants"
import { toast } from "sonner"

export function PublicRegisterView() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "", gender: "Male", age: "", address: "", city: "", bloodGroup: "", preferredDate: "", notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ patientCode: string; name: string; token?: number; date?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.phone) { setError("First name, last name, and phone are required"); return }
    setLoading(true)
    setError(null)
    try {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || undefined,
        gender: form.gender,
        age: form.age ? Number(form.age) : undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        bloodGroup: form.bloodGroup || undefined,
        preferredDate: form.preferredDate || undefined,
        notes: form.notes || undefined,
      }
      const res = await api.post<{ ok: boolean; patient: any; appointment: any; message: string; error?: string; existingPatientCode?: string }>("/api/public/register", payload)
      if (res.ok) {
        setSuccess({
          patientCode: res.patient.patientCode,
          name: res.patient.name,
          token: res.appointment?.tokenNumber,
          date: res.appointment?.date,
        })
        toast.success("Registration successful!")
      } else {
        setError(res.error || "Registration failed")
      }
    } catch (e: any) {
      setError(e.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = () => {
    window.location.href = "/"
  }

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid p-6">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <Card className="relative w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registration Successful!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Welcome to MediCore Diagnostics</p>

          <div className="mt-6 space-y-3 rounded-lg border bg-muted/40 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Patient Code</span>
              <code className="font-mono text-sm font-semibold text-emerald-600">{success.patientCode}</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{success.name}</span>
            </div>
            {success.token && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token Number</span>
                <span className="text-sm font-semibold text-violet-600">#{success.token}</span>
              </div>
            )}
            {success.date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Appointment</span>
                <span className="text-sm font-medium">{new Date(success.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Please note your Patient Code. Our team will contact you on <strong>{form.phone}</strong> to confirm your appointment.
            Bring a valid ID proof on your visit.
          </p>

          <Button onClick={backToLogin} variant="outline" className="mt-6 w-full">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid p-6">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="relative w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <TestTube2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Self-Registration</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">MediCore Diagnostics · Book your lab visit online</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs">First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="John" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Doe" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs">Phone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs">Age</Label>
              <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="35" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Blood Group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs">Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Bengaluru" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Preferred Date</Label>
              <Input type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-xs">Notes (optional)</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any specific tests or concerns" />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register & Book Appointment
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +91 80 4000 1000</span>
          <button onClick={backToLogin} className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Staff Login
          </button>
        </div>
      </div>
    </div>
  )
}
