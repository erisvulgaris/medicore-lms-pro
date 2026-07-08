"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  TestTube2, Search, ScanLine, CheckCircle2, XCircle, Beaker, User, Clock,
} from "lucide-react"
import { SAMPLE_STATUS } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_TABS = ["ALL", ...Object.keys(SAMPLE_STATUS)]

export function SamplesView() {
  const { can } = useApp()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("ALL")

  const { data, isLoading } = useQuery({
    queryKey: ["samples", q, status],
    queryFn: () =>
      api.get<{ samples: any[] }>(
        `/api/samples?q=${encodeURIComponent(q)}&status=${status}`,
      ),
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Sample Collection" subtitle="Track and manage collected samples" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by barcode, sample code, or patient…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="flex h-9 flex-wrap">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {t === "ALL" ? "All" : SAMPLE_STATUS[t as keyof typeof SAMPLE_STATUS]?.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !data?.samples.length ? (
          <EmptyState
            icon={TestTube2}
            title="No samples found"
            description="Try a different search or status filter."
          />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {data.samples.map((s) => (
                <SampleRow key={s.id} sample={s} canWrite={can("samples.write")} />
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function Barcode({ value }: { value: string }) {
  // A pseudo-barcode visual: vertical bars via repeating-linear-gradient,
  // bar width derived from the barcode length so each sample looks distinct.
  const barW = (value.length % 3) + 1
  const gapW = barW + 2
  return (
    <div className="flex flex-col gap-1">
      <div
        aria-hidden
        className="h-7 w-28 text-foreground"
        style={{
          background: `repeating-linear-gradient(90deg, currentColor 0px, currentColor ${barW}px, transparent ${barW}px, transparent ${gapW}px)`,
          opacity: 0.85,
        }}
      />
      <span className="font-mono text-[10px] tracking-[0.15em]">{value}</span>
    </div>
  )
}

function SampleRow({ sample, canWrite }: { sample: any; canWrite: boolean }) {
  const qc = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState("")

  const st = SAMPLE_STATUS[sample.status as keyof typeof SAMPLE_STATUS]

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["samples"] })
  }

  const receiveMut = useMutation({
    mutationFn: () => api.patch(`/api/samples/${sample.id}`, { status: "RECEIVED" }),
    onSuccess: () => {
      toast.success(`Sample ${sample.sampleCode} received`)
      invalidate()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const rejectMut = useMutation({
    mutationFn: () => api.patch(`/api/samples/${sample.id}`, { status: "REJECTED", rejectionReason: reason }),
    onSuccess: () => {
      toast.success(`Sample ${sample.sampleCode} rejected`)
      invalidate()
      setRejectOpen(false)
      setReason("")
    },
    onError: (e: any) => toast.error(e.message),
  })

  const patient = sample.order?.patient
  const canAct = canWrite && sample.status !== "REJECTED" && sample.status !== "COMPLETED"

  return (
    <div className="px-4 py-3.5 transition-colors hover:bg-muted/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Barcode block */}
        <div className="flex items-center gap-3 lg:w-56">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ScanLine className="h-5 w-5 text-muted-foreground" />
          </div>
          <Barcode value={sample.barcode} />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : "—"}</p>
            <Badge variant="outline" className="font-mono text-[10px]">{sample.sampleCode}</Badge>
            {sample.order?.orderCode && (
              <Badge variant="outline" className="font-mono text-[10px]">{sample.order.orderCode}</Badge>
            )}
            {patient?.patientCode && (
              <Badge variant="secondary" className="font-mono text-[10px]">{patient.patientCode}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Beaker className="h-3 w-3" /> {sample.sampleType || "—"}</span>
            <span className="inline-flex items-center gap-1"><TestTube2 className="h-3 w-3" /> {sample.tubeType || "—"}</span>
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {sample.collectorName || sample.collectedBy?.name || "—"}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(sample.collectedAt)}</span>
          </div>
          {sample.rejectionReason && (
            <p className="mt-1 inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <XCircle className="h-3 w-3" /> Rejected: {sample.rejectionReason}
            </p>
          )}
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-2 lg:w-auto">
          <span className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium text-white", st?.color)}>
            {st?.label}
          </span>
          {canAct && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                disabled={receiveMut.isPending || sample.status === "RECEIVED" || sample.status === "PROCESSING"}
                onClick={() => receiveMut.mutate()}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Receive
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                disabled={rejectMut.isPending}
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject sample {sample.sampleCode}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Rejected samples cannot be processed further. A reason is required for audit and re-collection.
            </p>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Rejection reason *</Label>
              <Textarea
                autoFocus
                rows={3}
                placeholder="e.g. Hemolysed sample, insufficient volume, wrong tube used…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
            >
              {rejectMut.isPending ? "Rejecting…" : "Reject Sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
