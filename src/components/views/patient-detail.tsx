"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, SectionCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Phone, Mail, MapPin, Droplet, Calendar, ClipboardList, Receipt, Activity, AlertTriangle, Building2 } from "lucide-react"
import { initials, formatDate, formatDateTime, calcAge, formatCurrency } from "@/lib/format"
import { ORDER_STATUS, INVOICE_STATUS, PRIORITY } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function PatientDetail() {
  const { viewParam, navigate, can } = useApp()
  const id = viewParam!
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.get<any>(`/api/patients/${id}`),
  })

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  if (!patient) return <EmptyState icon={AlertTriangle} title="Patient not found" />

  const timeline = [
    ...patient.orders.map((o: any) => ({ type: "order", date: o.createdAt, title: `Order ${o.orderCode}`, subtitle: o.status, icon: ClipboardList, id: o.id })),
    ...patient.invoices.map((i: any) => ({ type: "invoice", date: i.createdAt, title: `Invoice ${i.invoiceCode}`, subtitle: i.status, icon: Receipt, id: i.id })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("patients")} className="text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to patients
      </Button>

      {/* Patient header card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-20 w-20 border-4 border-background">
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initials(`${patient.firstName} ${patient.lastName}`)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">{patient.firstName} {patient.lastName}</h1>
                <Badge variant="outline" className="font-mono text-xs">{patient.patientCode}</Badge>
                {patient.isCorporate && <Badge variant="secondary" className="gap-1"><Building2 className="h-3 w-3" /> {patient.corporateName || "Corporate"}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{patient.gender} · {patient.age ?? calcAge(patient.dob)} years · Registered {formatDate(patient.createdAt)}</p>
            </div>
            {can("orders.write") && <Button onClick={() => navigate("orders", "new")}><ClipboardList className="mr-2 h-4 w-4" /> New Order</Button>}
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoRow icon={Phone} label="Phone" value={patient.phone || "—"} />
            <InfoRow icon={Mail} label="Email" value={patient.email || "—"} />
            <InfoRow icon={Droplet} label="Blood Group" value={patient.bloodGroup || "—"} />
            <InfoRow icon={Calendar} label="Date of Birth" value={patient.dob ? formatDate(patient.dob) : "—"} />
            <InfoRow icon={MapPin} label="Address" value={[patient.address, patient.city, patient.state].filter(Boolean).join(", ") || "—"} />
            <InfoRow icon={AlertTriangle} label="Allergies" value={patient.allergies || "None reported"} />
            <InfoRow icon={Activity} label="Medical History" value={patient.medicalHistory || "—"} />
            <InfoRow icon={Phone} label="Emergency Contact" value={patient.emergencyContact || "—"} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders */}
        <SectionCard title="Test Orders" description={`${patient.orders.length} total`}>
          {patient.orders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No orders" />
          ) : (
            <div className="space-y-1">
              {patient.orders.map((o: any) => {
                const st = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS]
                const pr = PRIORITY[o.priority as keyof typeof PRIORITY]
                return (
                  <button key={o.id} onClick={() => navigate("order-detail", o.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted/50">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", st?.color)}><ClipboardList className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{o.orderCode} {o.doctor && <span className="text-xs text-muted-foreground">· {o.doctor.name}</span>}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", pr?.color)}>{pr?.label}</span>
                      <p className="mt-1 text-xs font-semibold">{formatCurrency(o.payableAmount)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* Invoices */}
        <SectionCard title="Invoices" description={`${patient.invoices.length} total`}>
          {patient.invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices" />
          ) : (
            <div className="space-y-1">
              {patient.invoices.map((i: any) => {
                const st = INVOICE_STATUS[i.status as keyof typeof INVOICE_STATUS]
                return (
                  <button key={i.id} onClick={() => navigate("invoice-detail", i.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted/50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Receipt className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{i.invoiceCode}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(i.invoiceDate)}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", st?.color)}>{st?.label}</span>
                      <p className="mt-1 text-xs font-semibold">{formatCurrency(i.totalAmount)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Timeline */}
      <SectionCard title="Patient Timeline" description="Chronological activity">
        {timeline.length === 0 ? <EmptyState icon={Activity} title="No activity" /> : (
          <div className="relative space-y-4 pl-4">
            <div className="absolute left-[5px] top-1 h-[calc(100%-1rem)] w-px bg-border" />
            {timeline.slice(0, 15).map((t: any, i: number) => (
              <div key={i} className="relative">
                <div className="absolute -left-4 top-1 flex h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                <button onClick={() => t.type === "order" ? navigate("order-detail", t.id) : navigate("invoice-detail", t.id)} className="flex items-center gap-2 text-left hover:underline">
                  <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.title}</span>
                  <Badge variant="outline" className="text-[10px]">{t.subtitle}</Badge>
                </button>
                <p className="ml-5 text-xs text-muted-foreground">{formatDateTime(t.date)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
