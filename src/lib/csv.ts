// Lightweight CSV export utility (client-side, no dependencies).
// Converts an array of row objects into RFC-4180-compliant CSV and triggers a download.

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let str = typeof value === "string" ? value : String(value)
  // escape quotes by doubling, wrap in quotes if it contains comma/quote/newline
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCSV(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (!rows.length) return ""
  const cols = columns ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
  const header = cols.map((c) => escapeCell(c.label)).join(",")
  const body = rows
    .map((row) => cols.map((c) => escapeCell(row[c.key])).join(","))
    .join("\n")
  return `${header}\n${body}`
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[], columns?: { key: string; label: string }[]) {
  const csv = toCSV(rows, columns)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Format a Date for a CSV-friendly timestamp
export function csvDate(d: Date | string | null | undefined): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return ""
  return date.toISOString().replace("T", " ").slice(0, 19)
}
