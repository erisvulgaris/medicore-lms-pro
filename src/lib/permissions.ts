// RBAC: roles map to permission sets. Data-driven, checked at API layer.

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ORG_OWNER: "Organization Owner",
  BRANCH_ADMIN: "Branch Admin",
  RECEPTIONIST: "Receptionist",
  LAB_TECHNICIAN: "Lab Technician",
  PATHOLOGIST: "Pathologist",
  DOCTOR: "Doctor",
  PHLEBOTOMIST: "Phlebotomist",
  CASHIER: "Cashier",
  ACCOUNTANT: "Accountant",
} as const

export type RoleKey = keyof typeof ROLES

// Granular permission keys
export const PERMISSIONS = [
  "dashboard.view",
  "patients.read",
  "patients.write",
  "doctors.read",
  "doctors.write",
  "tests.read",
  "tests.write",
  "appointments.read",
  "appointments.write",
  "orders.read",
  "orders.write",
  "samples.read",
  "samples.write",
  "results.read",
  "results.write",
  "results.approve",
  "reports.read",
  "reports.approve",
  "invoices.read",
  "invoices.write",
  "payments.receive",
  "finance.view",
  "inventory.read",
  "inventory.write",
  "purchases.read",
  "purchases.write",
  "settings.manage",
  "audit.view",
  "users.manage",
] as const

export type Permission = (typeof PERMISSIONS)[number]

// Role → permission set. "*" means all permissions.
export const ROLE_PERMISSIONS: Record<RoleKey, Permission[] | "*"> = {
  SUPER_ADMIN: "*",
  ORG_OWNER: "*",
  BRANCH_ADMIN: [
    "dashboard.view",
    "patients.read",
    "patients.write",
    "doctors.read",
    "doctors.write",
    "tests.read",
    "appointments.read",
    "appointments.write",
    "orders.read",
    "orders.write",
    "samples.read",
    "samples.write",
    "results.read",
    "results.write",
    "reports.read",
    "invoices.read",
    "invoices.write",
    "payments.receive",
    "finance.view",
    "inventory.read",
    "inventory.write",
    "purchases.read",
    "purchases.write",
    "audit.view",
  ],
  RECEPTIONIST: [
    "dashboard.view",
    "patients.read",
    "patients.write",
    "doctors.read",
    "tests.read",
    "appointments.read",
    "appointments.write",
    "orders.read",
    "orders.write",
    "invoices.read",
    "invoices.write",
  ],
  LAB_TECHNICIAN: [
    "dashboard.view",
    "patients.read",
    "tests.read",
    "orders.read",
    "samples.read",
    "samples.write",
    "results.read",
    "results.write",
    "reports.read",
  ],
  PATHOLOGIST: [
    "dashboard.view",
    "patients.read",
    "tests.read",
    "orders.read",
    "samples.read",
    "results.read",
    "results.write",
    "results.approve",
    "reports.read",
    "reports.approve",
  ],
  DOCTOR: [
    "dashboard.view",
    "patients.read",
    "tests.read",
    "orders.read",
    "reports.read",
  ],
  PHLEBOTOMIST: [
    "dashboard.view",
    "patients.read",
    "orders.read",
    "samples.read",
    "samples.write",
  ],
  CASHIER: [
    "dashboard.view",
    "patients.read",
    "invoices.read",
    "invoices.write",
    "payments.receive",
  ],
  ACCOUNTANT: [
    "dashboard.view",
    "invoices.read",
    "payments.receive",
    "finance.view",
    "purchases.read",
    "audit.view",
  ],
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as RoleKey]
  if (!perms) return false
  if (perms === "*") return true
  return perms.includes(permission)
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

// Nav items keyed by permission. Used to filter sidebar.
export function getAccessibleNavItems(role: string): boolean {
  return Object.keys(ROLE_PERMISSIONS).includes(role)
}
