"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { RESULT_FLAG } from "@/lib/constants"
import { formatDateTime, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Building2,
  MapPin,
  Phone,
  User,
  Stethoscope,
  FileText,
  Lock,
  Activity,
} from "lucide-react"

type VerifyReport = {
  id: string
  reportCode: string
  status: string
  approvedAt: string | null
  pathologistRemarks: string | null
  createdAt: string
  order: {
    orderCode: string
    createdAt: string
    patient: {
      firstName: string
      lastName: string
      patientCode: string
      gender: string | null
      age: number | null
    }
    doctor: { name: string; specialization: string | null } | null
    orderTests: Array<{
      id: string
      test: { name: string; shortName: string | null; unit: string | null }
      results: Array<{
        id: string
        value: string
        unit: string | null
        flag: string
        referenceRange: string | null
      }>
    }>
  }
  approvedBy: { name: string } | null
  organization: {
    name: string
    city: string | null
    phone: string | null
    address: string | null
  }
}

const VERIFIED_STATUSES = ["APPROVED", "DELIVERED"]

export function VerifyView({ token }: { token: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verify", token],
    queryFn: () => api.get<{ report: VerifyReport }>(`/api/verify/${token}`),
    retry: false,
  })

  const report = data?.report

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:py-12">
        {isLoading ? (
          <LoadingState />
        ) : isError || !report ? (
          <InvalidTokenState />
        ) : (
          <ReportView report={report} />
        )}

        <footer className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>This report was verified via secure token. MediCore LMS · Pathology Laboratory Management System.</span>
        </footer>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Activity className="h-5 w-5 animate-pulse text-primary" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Verifying report authenticity…</p>
    </div>
  )
}

function InvalidTokenState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
        <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-400" />
      </div>
      <h1 className="mt-6 text-xl font-semibold">Report not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The verification token is invalid, expired, or the report does not exist. Please contact the issuing laboratory if you believe this is an error.
      </p>
      <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
        Invalid verification token
      </div>
    </div>
  )
}

function ReportView({ report }: { report: VerifyReport }) {
  const isVerified = VERIFIED_STATUSES.includes(report.status)
  const org = report.organization
  const patient = report.order.patient
  const allResults = report.order.orderTests.flatMap((ot) =>
    ot.results.map((r) => ({ ...r, testName: ot.test.name, shortName: ot.test.shortName, testUnit: ot.test.unit }))
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              isVerified ? "bg-emerald-100 dark:bg-emerald-950" : "bg-amber-100 dark:bg-amber-950"
            )}>
              <ShieldCheck className={cn("h-6 w-6", isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Report Verification</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Authentic report issued by <span className="font-medium text-foreground">{org.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Verification banner */}
        <div className={cn(
          "mt-5 flex items-center gap-3 rounded-xl border px-4 py-3",
          isVerified
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
            : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
        )}>
          {isVerified ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              isVerified ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"
            )}>
              {isVerified ? "✓ Verified authentic report" : "Report not yet finalized"}
            </p>
            <p className={cn(
              "text-xs",
              isVerified ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
            )}>
              {isVerified
                ? `Approved on ${report.approvedAt ? formatDateTime(report.approvedAt) : formatDate(report.createdAt)}`
                : `Current status: ${report.status}. Verification completes upon approval.`}
            </p>
          </div>
        </div>
      </div>

      {/* Organization card */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{org.name}</p>
            <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              {org.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> <span>{org.address}{org.city ? `, ${org.city}` : ""}</span>
                </div>
              )}
              {org.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> <span>{org.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report + Patient details */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Report details
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Report code" value={<span className="font-mono">{report.reportCode}</span>} />
            <Row label="Order code" value={<span className="font-mono">{report.order.orderCode}</span>} />
            <Row label="Report date" value={formatDate(report.createdAt)} />
            {report.approvedAt && <Row label="Approved on" value={formatDateTime(report.approvedAt)} />}
          </dl>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Patient details
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Patient name" value={`${patient.firstName} ${patient.lastName}`} />
            <Row label="Patient code" value={<span className="font-mono">{patient.patientCode}</span>} />
            <Row
              label="Age / Gender"
              value={`${patient.age ?? "—"} yrs · ${patient.gender ?? "—"}`}
            />
            <Row
              label="Referring doctor"
              value={report.order.doctor ? `${report.order.doctor.name}${report.order.doctor.specialization ? ` (${report.order.doctor.specialization})` : ""}` : "—"}
              icon={<Stethoscope className="h-3 w-3" />}
            />
          </dl>
        </div>
      </div>

      {/* Results table */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Test results</h2>
          <span className="text-xs text-muted-foreground">{allResults.length} parameter{allResults.length === 1 ? "" : "s"}</span>
        </div>
        {allResults.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No results recorded for this report.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Test</th>
                  <th className="pb-2 pr-3 font-medium">Result</th>
                  <th className="pb-2 pr-3 font-medium">Unit</th>
                  <th className="pb-2 pr-3 font-medium">Reference range</th>
                  <th className="pb-2 text-right font-medium">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allResults.map((r, i) => {
                  const flag = RESULT_FLAG[r.flag as keyof typeof RESULT_FLAG] ?? RESULT_FLAG.NORMAL
                  return (
                    <tr key={r.id ?? i} className="align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{r.testName}</div>
                        {r.shortName && r.shortName !== r.testName && (
                          <div className="text-[11px] text-muted-foreground">{r.shortName}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono font-medium">{r.value}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{r.unit ?? r.testUnit ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{r.referenceRange ?? "—"}</td>
                      <td className="py-2.5 text-right">
                        <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium", flag.badge)}>
                          {flag.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pathologist / Approval */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Pathologist approval
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {report.approvedBy?.name ?? "Pending pathologist review"}
            </p>
            <p className="text-xs text-muted-foreground">
              {report.approvedBy
                ? "Approved & digitally signed"
                : "This report has not yet been approved by a pathologist."}
            </p>
          </div>
          {report.approvedAt && (
            <div className="text-right text-xs text-muted-foreground">
              <p>Approved on</p>
              <p className="font-medium text-foreground">{formatDateTime(report.approvedAt)}</p>
            </div>
          )}
        </div>
        {report.pathologistRemarks && (
          <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
            <span className="font-medium text-muted-foreground">Remarks: </span>
            <span>{report.pathologistRemarks}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  )
}
