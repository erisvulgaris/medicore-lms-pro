"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CalendarClock, Plus, Search, Loader2, Clock, Hash, Stethoscope, Home, User, ChevronLeft, ChevronRight, CheckCircle2, CalendarDays,
} from "lucide-react"
import { APPOINTMENT_TYPES } from "@/lib/constants"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const APPT_STATUS: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Scheduled", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  CHECKED_IN: { label: "Checked In", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  COMPLETED: { label: "Completed", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  CANCELLED: { label: "Cancelled", className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
  NO_SHOW: { label: "No Show", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
}

const TYPE_LABEL: Record<string, string> = {
  WALK_IN: "Walk-in",
  SCHEDULED: "Scheduled",
  HOME_COLLECTION: "Home Collection",
  CORPORATE: "Corporate",
  ONLINE: "Online",
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function AppointmentsView() {
  const { navigate, can } = useApp()
  const [date, setDate] = useState<string>(todayStr())
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", date],
    queryFn: () => api.get<{ appointments: any[] }>(`/api/appointments?date=${date}`),
  })

  const appts = data?.appointments ?? []
  const completed = appts.filter((a) => a.status === "COMPLETED").length
  const scheduled = appts.filter((a) => a.status === "SCHEDULED" || a.status === "CHECKED_IN").length

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Schedule and manage patient visits"
        actions={can("appointments.write") && (
          <BookAppointmentDialog open={createOpen} onOpenChange={setCreateOpen} defaultDate={date} onBooked={(d) => setDate(d)} />
        )}
      />

      <div className="grid grid-cols-3 gap-3 sm:max-w-2xl">
        <StatCard label="Total Today" value={appts.length} icon={CalendarDays} accent="emerald" />
        <StatCard label="Scheduled" value={scheduled} icon={Clock} accent="amber" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} accent="emerald" />
      </div>

      {/* Date picker */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="w-[200px] pl-9"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {date !== todayStr() && (
              <Button variant="ghost" size="sm" onClick={() => setDate(todayStr())} className="text-xs">Today</Button>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">{formattedDate}</p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : appts.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No appointments for this date"
            description="Pick a different day or book a new appointment."
            action={can("appointments.write") && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Book Appointment
              </Button>
            )}
          />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {appts
                .slice()
                .sort((a, b) => (a.timeSlot || "").localeCompare(b.timeSlot || ""))
                .map((a) => (
                  <AppointmentRow key={a.id} appt={a} onOpen={() => navigate("patient-detail", a.patient?.id)} />
                ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function AppointmentRow({ appt, onOpen }: { appt: any; onOpen: () => void }) {
  const st = APPT_STATUS[appt.status] ?? APPT_STATUS.SCHEDULED
  const typeLabel = TYPE_LABEL[appt.type] ?? appt.type
  const isHome = appt.type === "HOME_COLLECTION"
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10">
        <Clock className="h-4 w-4 text-primary" />
        <span className="mt-0.5 text-[10px] font-semibold text-primary">{appt.timeSlot || "—"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{appt.patient?.firstName} {appt.patient?.lastName}</p>
          <Badge variant="outline" className="font-mono text-[10px]">{appt.patient?.patientCode}</Badge>
          {appt.tokenNumber != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
              <Hash className="h-2.5 w-2.5" /> #{appt.tokenNumber}
            </span>
          )}
          <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
          {isHome && <Badge variant="outline" className="gap-1 text-[10px]"><Home className="h-2.5 w-2.5" /> Home</Badge>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {appt.doctor && <span className="inline-flex items-center gap-1"><Stethoscope className="h-3 w-3" /> {appt.doctor.name}</span>}
          {appt.patient?.phone && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {appt.patient.phone}</span>}
          {appt.notes && <span className="italic truncate max-w-[200px]">"{appt.notes}"</span>}
        </p>
      </div>
      <span className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium", st.className)}>{st.label}</span>
    </button>
  )
}

function BookAppointmentDialog({
  open, onOpenChange, defaultDate, onBooked,
}: { open: boolean; onOpenChange: (v: boolean) => void; defaultDate: string; onBooked: (date: string) => void }) {
  const qc = useQueryClient()
  const [patientQ, setPatientQ] = useState("")
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientLabel, setPatientLabel] = useState<string>("")
  const [doctorId, setDoctorId] = useState<string>("")
  const [appointmentDate, setAppointmentDate] = useState<string>(defaultDate)
  const [timeSlot, setTimeSlot] = useState<string>("")
  const [type, setType] = useState<string>("WALK_IN")
  const [notes, setNotes] = useState<string>("")
  const [homeAddress, setHomeAddress] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const { data: patientsData } = useQuery({
    queryKey: ["patients", patientQ],
    queryFn: () => api.get<{ patients: any[] }>(`/api/patients?q=${encodeURIComponent(patientQ)}`),
    enabled: open,
  })
  const { data: doctorsData } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.get<{ doctors: any[] }>("/api/doctors"),
    enabled: open,
  })

  const reset = () => {
    setPatientQ(""); setPatientId(null); setPatientLabel(""); setDoctorId("")
    setAppointmentDate(defaultDate); setTimeSlot(""); setType("WALK_IN")
    setNotes(""); setHomeAddress("")
  }

  const submit = async () => {
    if (!patientId) { toast.error("Select a patient"); return }
    if (!appointmentDate) { toast.error("Pick an appointment date"); return }
    if (!timeSlot) { toast.error("Enter a time slot"); return }
    if (type === "HOME_COLLECTION" && !homeAddress) { toast.error("Home address is required for home collection"); return }
    setSaving(true)
    try {
      await api.post("/api/appointments", {
        patientId, doctorId: doctorId || undefined,
        appointmentDate, timeSlot, type, notes,
        homeAddress: type === "HOME_COLLECTION" ? homeAddress : undefined,
      })
      toast.success("Appointment booked")
      qc.invalidateQueries({ queryKey: ["appointments"] })
      onBooked(appointmentDate)
      onOpenChange(false)
      reset()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Book Appointment</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Patient picker */}
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Patient *</Label>
            {patientId ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(patientLabel)}
                </div>
                <span className="flex-1 text-sm font-medium">{patientLabel}</span>
                <Button variant="ghost" size="sm" onClick={() => { setPatientId(null); setPatientLabel("") }}>Change</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search patient by name, phone, or code…"
                    value={patientQ}
                    onChange={(e) => setPatientQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-48 rounded-lg border">
                  <div className="divide-y">
                    {(patientsData?.patients ?? []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setPatientId(p.id); setPatientLabel(`${p.firstName} ${p.lastName} · ${p.patientCode}`) }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(`${p.firstName} ${p.lastName}`)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.firstName} {p.lastName} <span className="font-mono text-xs text-muted-foreground">{p.patientCode}</span></p>
                          <p className="truncate text-xs text-muted-foreground">{p.gender || "—"} · {p.age ?? "—"} yrs · {p.phone || "no phone"}</p>
                        </div>
                      </button>
                    ))}
                    {(patientsData?.patients ?? []).length === 0 && (
                      <p className="px-3 py-8 text-center text-sm text-muted-foreground">Type to search patients</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Doctor">
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Select referring doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctorsData?.doctors ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}{d.specialization ? ` · ${d.specialization}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABEL[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date *">
              <Input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
            </Field>
            <Field label="Time Slot *">
              <Input placeholder="e.g. 09:30 AM" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
            </Field>
          </div>

          {type === "HOME_COLLECTION" && (
            <Field label="Home Address *">
              <Textarea
                placeholder="Full address for home collection visit"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                rows={2}
              />
            </Field>
          )}

          <Field label="Notes">
            <Textarea
              placeholder="Clinical notes, prep instructions, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Book Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
