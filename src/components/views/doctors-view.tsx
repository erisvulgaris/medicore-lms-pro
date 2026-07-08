"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Stethoscope,
  Search,
  Plus,
  Phone,
  Mail,
  Building2,
  UserPlus,
  Loader2,
  Users,
  TrendingUp,
  Percent,
  Info,
} from "lucide-react"
import { initials, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Doctor = {
  id: string
  name: string
  specialization: string | null
  qualifications: string | null
  phone: string | null
  email: string | null
  clinicName: string | null
  clinicAddress: string | null
  commissionRate: number
  commissionEnabled: boolean
  referralCount: number
}

export function DoctorsView() {
  const { can } = useApp()
  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", q],
    queryFn: () => api.get<{ doctors: Doctor[] }>(`/api/doctors?q=${encodeURIComponent(q)}`),
  })

  const doctors = data?.doctors ?? []
  const total = doctors.length
  const totalReferrals = doctors.reduce((s, d) => s + (d.referralCount || 0), 0)
  const activeCommission = doctors.filter((d) => d.commissionEnabled).length
  const avgCommission =
    activeCommission > 0
      ? doctors.filter((d) => d.commissionEnabled).reduce((s, d) => s + (d.commissionRate || 0), 0) /
        activeCommission
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referring Doctors"
        subtitle="Manage referring physicians and referral analytics"
        actions={
          can("doctors.write") && (
            <AddDoctorDialog open={createOpen} onOpenChange={setCreateOpen} />
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Doctors" value={formatNumber(total)} icon={Users} accent="emerald" />
        <StatCard label="Total Referrals" value={formatNumber(totalReferrals)} icon={TrendingUp} accent="violet" />
        <StatCard label="Commission Active" value={formatNumber(activeCommission)} icon={Percent} accent={activeCommission > 0 ? "amber" : "slate"} />
        <StatCard label="Avg Commission" value={`${avgCommission.toFixed(1)}%`} icon={Percent} accent="slate" sub="Across active setups" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, specialization, or clinic…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !doctors.length ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors found"
          description="Try a different search, or add a new referring physician."
          action={
            can("doctors.write") && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Doctor
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function DoctorCard({ doctor: d }: { doctor: Doctor }) {
  return (
    <Card className="flex flex-col p-5 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials(d.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{d.name}</p>
          {d.specialization && (
            <p className="truncate text-xs text-muted-foreground">{d.specialization}</p>
          )}
        </div>
        {d.commissionEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                <Percent className="h-3 w-3" /> {d.commissionRate.toFixed(1)}%
                <Info className="h-2.5 w-2.5 opacity-70" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px] text-left">
              Commission tracking is configurable and off by default; enable only where legally permitted.
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {d.clinicName && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" /> <span className="truncate text-foreground">{d.clinicName}</span>
        </div>
      )}

      <div className="mt-2 space-y-1 text-xs">
        {d.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3 w-3" /> <span className="text-foreground">{d.phone}</span>
          </div>
        )}
        {d.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3 w-3" /> <span className="truncate text-foreground">{d.email}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Referrals</p>
          <p className="text-lg font-semibold">{formatNumber(d.referralCount)}</p>
        </div>
        {d.qualifications && (
          <p className="max-w-[55%] text-right text-[11px] italic text-muted-foreground line-clamp-2">
            {d.qualifications}
          </p>
        )}
      </div>
    </Card>
  )
}

function AddDoctorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: "",
    specialization: "",
    qualifications: "",
    phone: "",
    email: "",
    clinicName: "",
    clinicAddress: "",
    commissionRate: "0",
    commissionEnabled: false,
  })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.name) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      await api.post("/api/doctors", {
        ...form,
        commissionRate: Number(form.commissionRate) || 0,
      })
      toast.success("Doctor added")
      qc.invalidateQueries({ queryKey: ["doctors"] })
      onOpenChange(false)
      setForm({ name: "", specialization: "", qualifications: "", phone: "", email: "", clinicName: "", clinicAddress: "", commissionRate: "0", commissionEnabled: false })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add doctor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Add Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add referring doctor</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Rajesh Sharma" /></Field>
          <Field label="Specialization"><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Cardiology" /></Field>
          <Field label="Qualifications" full><Input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="MBBS, MD — Cardiology" /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@clinic.com" /></Field>
          <Field label="Clinic name"><Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} /></Field>
          <Field label="Clinic address"><Input value={form.clinicAddress} onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })} /></Field>
          <Field label="Commission rate (%)"><Input type="number" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} disabled={!form.commissionEnabled} /></Field>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Enable commission tracking</p>
              <p className="text-[11px] text-muted-foreground">Enable only where legally permitted under applicable regulations.</p>
            </div>
            <Switch checked={form.commissionEnabled} onCheckedChange={(v) => setForm({ ...form, commissionEnabled: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Doctor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
