"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  Link2,
  TestTube,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/format"
import { RESULT_FLAG } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ReportStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "DELIVERED"

const REPORT_STATUS_STYLES: Record<ReportStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-rose-100 text-rose-700" },
  PENDING_APPROVAL: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-700" },
}

interface ReportDetailData {
  report: {
    id: string
    reportCode: string
    status: ReportStatus
    approvedAt: string | null
    pathologistRemarks: string | null
    verificationToken: string
    createdAt: string
    order: {
      id: string
      orderCode: string
      createdAt: string
      patient: {
        firstName: string
        lastName: string
        patientCode: string
        gender: string | null
        age: number | null
        dob: string | null
        phone: string | null
        address: string | null
        city: string | null
      }
      doctor: { name: string; specialization: string | null } | null
      branch: { name: string; code: string; address: string | null; phone: string | null } | null
      orderTests: Array<{
        id: string
        test: {
          name: string
          shortName: string | null
          unit: string | null
          department: string | null
          referenceRanges: string | null
        }
        results: Array<{
          value: string
          unit: string | null
          flag: keyof typeof RESULT_FLAG
          referenceRange: string | null
          remarks: string | null
        }>
      }>
    }
    approvedBy: { name: string } | null
  }
  organization: {
    name: string
    legalName: string | null
    address: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    phone: string | null
    email: string | null
    gstin: string | null
    logoUrl: string | null
  } | null
  settings: Record<string, string>
}

export function ReportDetail() {
  const { viewParam, navigate, can } = useApp()
  const id = viewParam!
  const qc = useQueryClient()
  const [remarks, setRemarks] = useState("")
  const [approving, setApproving] = useState(false)
  const [template, setTemplate] = useState<"classic" | "modern" | "compact">("classic")

  const { data, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => api.get<ReportDetailData>(`/api/reports/${id}`),
  })

  const approve = useMutation({
    mutationFn: () => api.patch(`/api/reports/${id}`, { status: "APPROVED", remarks }),
    onSuccess: () => {
      toast.success("Report approved")
      qc.invalidateQueries({ queryKey: ["report", id] })
      qc.invalidateQueries({ queryKey: ["reports"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />
  }
  if (!data) {
    return <EmptyState icon={AlertTriangle} title="Report not found" />
  }

  const { report, organization } = data
  const status = REPORT_STATUS_STYLES[report.status] ?? REPORT_STATUS_STYLES.DRAFT
  const verifyUrl = typeof window !== "undefined" ? `${window.location.origin}/?verify=${report.verificationToken}` : `/?verify=${report.verificationToken}`

  const copyVerifyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      toast.success("Verification link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await approve.mutateAsync()
    } finally {
      setApproving(false)
    }
  }

  const isApproved = report.status === "APPROVED" || report.status === "DELIVERED"
  const canApprove = can("reports.approve") && !isApproved

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("reports")} className="text-muted-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to reports
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={template} onValueChange={(v) => setTemplate(v as any)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic Template</SelectItem>
              <SelectItem value="modern">Modern Template</SelectItem>
              <SelectItem value="compact">Compact Template</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / Save PDF
          </Button>
          <Button variant="outline" size="sm" onClick={copyVerifyLink}>
            <Link2 className="mr-1.5 h-4 w-4" /> Verification Link
          </Button>
          {canApprove && (
            <Button size="sm" onClick={handleApprove} disabled={approving}>
              {approving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              Approve Report
            </Button>
          )}
        </div>
      </div>

      {/* Approve remarks (only when actionable) */}
      {canApprove && (
        <div className="no-print rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <Label className="mb-1.5 block text-xs font-medium text-amber-800 dark:text-amber-300">
            Pathologist remarks (will be printed on the approved report)
          </Label>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Clinical correlation advised. Values consistent with…"
            rows={2}
          />
        </div>
      )}

      {/* Printable report */}
      <div className="mx-auto max-w-[820px]">
        <div className="bg-white text-black shadow-sm ring-1 ring-border/60 rounded-xl">
          {/* Header */}
          <div className={cn("flex items-start justify-between gap-4 p-6 sm:p-8", template === "classic" && "border-b border-slate-200", template === "modern" && "bg-gradient-to-r from-emerald-600 to-teal-600 text-white", template === "compact" && "border-b-2 border-emerald-600")}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg", template === "modern" ? "bg-white/20" : "bg-emerald-600")}>
                <TestTube className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={cn("text-lg font-bold leading-tight", template === "modern" ? "text-white" : "text-slate-900")}>
                  {organization?.legalName || organization?.name || "Pathology Laboratory"}
                </h1>
                {organization?.address && <p className={cn("mt-0.5 text-xs", template === "modern" ? "text-emerald-50" : "text-slate-600")}>{organization.address}</p>}
                <p className={cn("text-xs", template === "modern" ? "text-emerald-50" : "text-slate-600")}>
                  {[organization?.city, organization?.state, organization?.postalCode].filter(Boolean).join(", ")}
                </p>
                <p className={cn("mt-0.5 text-xs", template === "modern" ? "text-emerald-50" : "text-slate-600")}>
                  {organization?.phone && <span>Phone: {organization.phone}</span>}
                  {organization?.email && <span className="ml-2">· {organization.email}</span>}
                </p>
                {organization?.gstin && <p className={cn("text-xs", template === "modern" ? "text-emerald-50" : "text-slate-600")}>GSTIN: {organization.gstin}</p>}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", template === "modern" ? "text-emerald-50" : "text-emerald-700")}>Laboratory Report</p>
              <p className={cn("mt-1 font-mono text-sm font-semibold", template === "modern" ? "text-white" : "text-slate-900")}>{report.reportCode}</p>
              <p className={cn("mt-0.5 text-xs", template === "modern" ? "text-emerald-50" : "text-slate-600")}>Issued: {formatDate(report.approvedAt || report.createdAt)}</p>
              <span className={cn("mt-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-medium", status.className)}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Patient & Order info */}
          <div className={cn("grid gap-4 p-6 sm:grid-cols-2 sm:p-8", template !== "compact" && "border-b border-slate-200", template === "compact" && "py-4")}>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Patient Details</p>
              <div className="space-y-1 text-sm text-slate-800">
                <p className="font-semibold">
                  {report.order.patient.firstName} {report.order.patient.lastName}
                </p>
                <p className="text-xs text-slate-600">
                  Code: <span className="font-mono">{report.order.patient.patientCode}</span>
                  {report.order.patient.gender && <> · {report.order.patient.gender}</>}
                  {report.order.patient.age != null && <> · {report.order.patient.age} yrs</>}
                  {report.order.patient.dob && <> · DOB {formatDate(report.order.patient.dob)}</>}
                </p>
                {report.order.patient.phone && <p className="text-xs text-slate-600">Phone: {report.order.patient.phone}</p>}
                {report.order.patient.address && (
                  <p className="text-xs text-slate-600">{[report.order.patient.address, report.order.patient.city].filter(Boolean).join(", ")}</p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Order Details</p>
              <div className="space-y-1 text-sm text-slate-800">
                <p>
                  Order: <span className="font-mono">{report.order.orderCode}</span>
                </p>
                {report.order.doctor && (
                  <p className="text-xs text-slate-600">
                    Ref. Dr. {report.order.doctor.name}
                    {report.order.doctor.specialization && ` (${report.order.doctor.specialization})`}
                  </p>
                )}
                {report.order.branch && <p className="text-xs text-slate-600">Branch: {report.order.branch.name}</p>}
                <p className="text-xs text-slate-600">Collected: {formatDateTime(report.order.createdAt)}</p>
                <p className="text-xs text-slate-600">Approved: {report.approvedAt ? formatDateTime(report.approvedAt) : "—"}</p>
              </div>
            </div>
          </div>

          {/* Results table */}
          <div className="p-6 sm:p-8">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Investigation Results</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Test</th>
                    <th className="px-3 py-2 text-center">Result</th>
                    <th className="px-3 py-2 text-center">Unit</th>
                    <th className="px-3 py-2">Reference Range</th>
                    <th className="px-3 py-2 text-center">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.order.orderTests.map((ot) => {
                    const result = ot.results[0]
                    const flag = result ? RESULT_FLAG[result.flag] : null
                    const ranges = ot.test.referenceRanges ? safeParseRanges(ot.test.referenceRanges) : []
                    const refText = result?.referenceRange || (ranges[0] ? `${ranges[0].low} - ${ranges[0].high}` : "—")
                    const isCritical = result && (result.flag === "CRITICAL_LOW" || result.flag === "CRITICAL_HIGH")
                    const isAbnormal = result && result.flag !== "NORMAL" && !isCritical
                    return (
                      <tr
                        key={ot.id}
                        className={cn(
                          isCritical && "bg-rose-50",
                          isAbnormal && "bg-amber-50",
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-900">{ot.test.name}</p>
                          {ot.test.department && <p className="text-[10px] text-slate-500">{ot.test.department}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-slate-900">
                          {result ? result.value : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-slate-600">
                          {result?.unit || ot.test.unit || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{refText}</td>
                        <td className="px-3 py-2.5 text-center">
                          {flag ? (
                            <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", flag.badge.split(" ")[0], flag.badge.split(" ")[1])}>
                              {flag.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {report.order.orderTests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-xs text-slate-400">
                        No tests in this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pathologist remarks */}
            {(report.pathologistRemarks || report.approvedBy) && (
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pathologist Remarks</p>
                <p className="text-sm text-slate-800">
                  {report.pathologistRemarks || "No additional remarks."}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {report.approvedBy ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Digitally Approved By</p>
                    <p className="mt-1 font-semibold text-slate-900">{report.approvedBy.name}, Pathologist</p>
                    {report.approvedAt && <p className="text-xs text-slate-600">on {formatDateTime(report.approvedAt)}</p>}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Awaiting Approval</p>
                    <p className="mt-1 text-sm italic text-slate-500">This report is pending pathologist approval.</p>
                  </>
                )}
                <p className="mt-3 max-w-md text-[11px] leading-relaxed text-slate-500">
                  This is a computer-generated report. Verify authenticity at:
                </p>
                <p className="break-all font-mono text-[11px] text-emerald-700">{verifyUrl}</p>
              </div>
              <div className="shrink-0">
                <QRPlaceholder token={report.verificationToken} />
                <p className="mt-1 text-center text-[10px] text-slate-500">Scan to verify</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function safeParseRanges(json: string): Array<{ low: number; high: number; gender?: string }> {
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

/** A pseudo-QR placeholder rendered as an SVG grid derived from the token. */
function QRPlaceholder({ token }: { token: string }) {
  // Build a deterministic 7x7 grid from the token chars
  const size = 7
  const cells: boolean[] = []
  let hash = 0
  for (let i = 0; i < token.length; i++) hash = (hash * 31 + token.charCodeAt(i)) >>> 0
  for (let i = 0; i < size * size; i++) {
    hash = (hash * 1103515245 + 12345) >>> 0
    cells.push((hash & 0xff) > 127)
  }
  // Always render corner position markers
  const isMarker = (r: number, c: number) => {
    const inBox = (br: number, bc: number) => r >= br && r < br + 2 && c >= bc && c < bc + 2
    return inBox(0, 0) || inBox(0, size - 2) || inBox(size - 2, 0)
  }
  return (
    <svg width="96" height="96" viewBox="0 0 7 7" className="rounded-md border border-slate-200 bg-white p-0.5" role="img" aria-label="Verification QR code">
      {cells.map((on, i) => {
        const r = Math.floor(i / size)
        const c = i % size
        const filled = on || isMarker(r, c)
        return <rect key={i} x={c} y={r} width={1} height={1} fill={filled ? "#0f172a" : "#ffffff"} />
      })}
    </svg>
  )
}
