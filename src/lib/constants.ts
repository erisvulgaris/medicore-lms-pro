// Lab workflow states, statuses, and domain constants

export const ORDER_STATUS = {
  REGISTERED: { label: "Registered", color: "bg-slate-500", step: 0 },
  COLLECTED: { label: "Collected", color: "bg-amber-500", step: 1 },
  PROCESSING: { label: "Processing", color: "bg-blue-500", step: 2 },
  COMPLETED: { label: "Completed", color: "bg-violet-500", step: 3 },
  VERIFIED: { label: "Verified", color: "bg-cyan-500", step: 4 },
  APPROVED: { label: "Approved", color: "bg-emerald-500", step: 5 },
  DELIVERED: { label: "Delivered", color: "bg-green-600", step: 6 },
  ARCHIVED: { label: "Archived", color: "bg-slate-400", step: 7 },
} as const

export const ORDER_STATUS_FLOW = [
  "REGISTERED",
  "COLLECTED",
  "PROCESSING",
  "COMPLETED",
  "VERIFIED",
  "APPROVED",
  "DELIVERED",
  "ARCHIVED",
] as const

export const SAMPLE_STATUS = {
  COLLECTED: { label: "Collected", color: "bg-amber-500" },
  RECEIVED: { label: "Received", color: "bg-blue-500" },
  PROCESSING: { label: "Processing", color: "bg-violet-500" },
  REJECTED: { label: "Rejected", color: "bg-rose-500" },
  COMPLETED: { label: "Completed", color: "bg-emerald-500" },
} as const

export const RESULT_FLAG = {
  NORMAL: { label: "Normal", color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  LOW: { label: "Low", color: "text-amber-600", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  HIGH: { label: "High", color: "text-orange-600", badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
  CRITICAL_LOW: { label: "Critical Low", color: "text-rose-600", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
  CRITICAL_HIGH: { label: "Critical High", color: "text-rose-600", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
  ABNORMAL: { label: "Abnormal", color: "text-orange-600", badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
} as const

export const PRIORITY = {
  ROUTINE: { label: "Routine", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  URGENT: { label: "Urgent", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  STAT: { label: "STAT", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
} as const

export const INVOICE_STATUS = {
  UNPAID: { label: "Unpaid", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" },
  PARTIAL: { label: "Partial", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  CANCELLED: { label: "Cancelled", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  REFUNDED: { label: "Refunded", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
} as const

export const PAYMENT_MODES = ["CASH", "CARD", "UPI", "NETBANKING", "CHEQUE", "WALLET"] as const
export const APPOINTMENT_TYPES = ["WALK_IN", "SCHEDULED", "HOME_COLLECTION", "CORPORATE", "ONLINE"] as const
export const INVENTORY_CATEGORIES = ["REAGENT", "CONSUMABLE", "EQUIPMENT"] as const
export const DEPARTMENTS = ["Biochemistry", "Hematology", "Microbiology", "Clinical Pathology", "Serology", "Histopathology", "Cytology", "Molecular"] as const

export const GENDERS = ["Male", "Female", "Other"] as const
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const

// Reference range evaluation
export interface RefRange {
  gender?: "Male" | "Female" | "All"
  minAge?: number
  maxAge?: number
  low: number
  high: number
  criticalLow?: number
  criticalHigh?: number
}

export function evaluateFlag(value: number, ranges: RefRange[], gender?: string | null, age?: number | null): keyof typeof RESULT_FLAG {
  const range = ranges.find((r) => {
    if (r.gender && r.gender !== "All" && r.gender !== gender) return false
    if (age != null) {
      if (r.minAge != null && age < r.minAge) return false
      if (r.maxAge != null && age > r.maxAge) return false
    }
    return true
  }) || ranges[0]
  if (!range) return "NORMAL"
  if (range.criticalLow != null && value <= range.criticalLow) return "CRITICAL_LOW"
  if (range.criticalHigh != null && value >= range.criticalHigh) return "CRITICAL_HIGH"
  if (value < range.low) return "LOW"
  if (value > range.high) return "HIGH"
  return "NORMAL"
}
