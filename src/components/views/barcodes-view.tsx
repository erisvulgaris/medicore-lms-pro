"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer, Search, ScanLine, TestTube2, CheckSquare } from "lucide-react"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function BarcodesView() {
  const [q, setQ] = useState("")
  const [selected, setSelected] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ["barcodes", q],
    queryFn: () => api.get<{ samples: any[] }>(`/api/samples?q=${encodeURIComponent(q)}`),
  })

  const samples = data?.samples ?? []

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const selectAll = () => setSelected(samples.slice(0, 24).map((s) => s.id))
  const clearAll = () => setSelected([])

  const print = () => {
    if (selected.length === 0) { toast.error("Select at least one sample to print"); return }
    toast.success(`Printing ${selected.length} label(s)…`)
    setTimeout(() => window.print(), 200)
  }

  const selectedSamples = samples.filter((s) => selected.includes(s.id))

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Barcode Labels"
          subtitle="Generate and print sample barcode labels"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={selectAll} disabled={samples.length === 0}><CheckSquare className="mr-2 h-4 w-4" /> Select All</Button>
              <Button onClick={print} disabled={selected.length === 0}><Printer className="mr-2 h-4 w-4" /> Print {selected.length > 0 ? `(${selected.length})` : ""}</Button>
            </div>
          }
        />

        {/* Search */}
        <div className="relative mt-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by barcode, sample code, or patient…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {/* Sample list */}
        <Card className="mt-4 overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : samples.length === 0 ? (
            <EmptyState icon={ScanLine} title="No samples found" description="Samples with barcodes will appear here for label printing." />
          ) : (
            <>
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <p className="text-sm font-medium">{samples.length} samples · {selected.length} selected</p>
                {selected.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">Clear selection</Button>}
              </div>
              <ScrollArea className="max-h-[55vh]">
                <div className="divide-y">
                  {samples.slice(0, 100).map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40">
                      <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><TestTube2 className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium">{s.barcode}</p>
                          <Badge variant="outline" className="text-[10px]">{s.sampleCode}</Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{s.order?.patient ? `${s.order.patient.firstName} ${s.order.patient.lastName}` : "—"} · {s.sampleType} · {s.tubeType}</p>
                      </div>
                      <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium text-white", s.status === "COLLECTED" ? "bg-amber-500" : s.status === "RECEIVED" ? "bg-blue-500" : s.status === "PROCESSING" ? "bg-violet-500" : s.status === "COMPLETED" ? "bg-emerald-500" : "bg-rose-500")}>{s.status}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </Card>
      </div>

      {/* Printable label sheet — only visible when printing */}
      {selectedSamples.length > 0 && (
        <div className="print-area">
          <LabelSheet samples={selectedSamples} />
        </div>
      )}

      {/* Inline preview (screen) */}
      {selectedSamples.length > 0 && (
        <div className="no-print">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Preview ({selectedSamples.length} labels)</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {selectedSamples.slice(0, 8).map((s) => <LabelPreview key={s.id} sample={s} />)}
          </div>
          {selectedSamples.length > 8 && <p className="mt-2 text-xs text-muted-foreground">+ {selectedSamples.length - 8} more — click Print to see all</p>}
        </div>
      )}
    </div>
  )
}

function BarcodeVisual({ value, height = 40 }: { value: string; height?: number }) {
  // Deterministic barcode from the string — alternate bars based on char codes
  const bars: { w: number; black: boolean }[] = []
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    bars.push({ w: (code % 3) + 1, black: true })
    bars.push({ w: ((code >> 2) % 2) + 1, black: false })
    bars.push({ w: ((code >> 4) % 3) + 1, black: i % 2 === 0 })
  }
  return (
    <div className="flex items-end" style={{ height }} aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => (
        <div key={i} style={{ width: `${b.w}px`, height: "100%", background: b.black ? "#000" : "transparent" }} />
      ))}
    </div>
  )
}

function LabelPreview({ sample }: { sample: any }) {
  const patientName = sample.order?.patient ? `${sample.order.patient.firstName} ${sample.order.patient.lastName}` : "—"
  const patientCode = sample.order?.patient?.patientCode ?? "—"
  return (
    <div className="rounded-lg border-2 border-dashed border-border bg-white p-3 text-black" style={{ width: "100%", minHeight: "120px" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold leading-tight">MediCore Diagnostics</p>
          <p className="text-[9px] text-gray-600">Pathology Lab</p>
        </div>
        <BarcodeVisual value={sample.barcode} height={28} />
      </div>
      <div className="my-1.5 border-t border-dashed border-gray-300" />
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">{patientName}</p>
          <p className="text-[9px] text-gray-600">{patientCode} · {sample.sampleType}</p>
          <p className="text-[9px] text-gray-600">{sample.collectedAt ? formatDate(sample.collectedAt) : formatDate(new Date())}</p>
        </div>
        <p className="font-mono text-[10px] font-bold">{sample.barcode}</p>
      </div>
    </div>
  )
}

function LabelSheet({ samples }: { samples: any[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", padding: "8px" }}>
      {samples.map((s) => {
        const patientName = s.order?.patient ? `${s.order.patient.firstName} ${s.order.patient.lastName}` : "—"
        const patientCode = s.order?.patient?.patientCode ?? "—"
        return (
          <div key={s.id} style={{ border: "1px solid #000", padding: "6px", background: "#fff", color: "#000", minHeight: "110px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 700 }}>MediCore Diagnostics</div>
                <div style={{ fontSize: "8px", color: "#444" }}>Pathology Lab</div>
              </div>
              <BarcodeVisual value={s.barcode} height={26} />
            </div>
            <div style={{ borderTop: "1px dashed #999", margin: "4px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600 }}>{patientName}</div>
                <div style={{ fontSize: "8px", color: "#444" }}>{patientCode} · {s.sampleType}</div>
                <div style={{ fontSize: "8px", color: "#444" }}>{s.collectedAt ? formatDate(s.collectedAt) : formatDate(new Date())}</div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: "9px", fontWeight: 700 }}>{s.barcode}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
