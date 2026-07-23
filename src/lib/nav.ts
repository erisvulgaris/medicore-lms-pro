import type { Permission } from "@/lib/permissions"
import {
  LayoutDashboard, Users, FlaskConical, CalendarClock, ClipboardList, TestTube2,
  Microscope, FileText, Receipt, Package, ShoppingCart, Stethoscope, Settings,
  ScrollText, Gauge, TrendingUp, MapPin, Printer, UserCircle, Zap, Store, ShieldCheck, Navigation, type LucideIcon,
} from "lucide-react"

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  permission: Permission
  group: string
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view", group: "Overview" },
  { key: "quick-lab", label: "Quick Lab", icon: Zap, permission: "dashboard.view", group: "Overview" },
  { key: "analytics", label: "Lab Analytics", icon: Gauge, permission: "dashboard.view", group: "Overview" },
  { key: "technicians", label: "Technician Productivity", icon: Microscope, permission: "dashboard.view", group: "Overview" },
  { key: "lab-owner", label: "Lab Owner Dashboard", icon: Store, permission: "dashboard.view", group: "Overview" },
  { key: "pickup", label: "Pickup Dashboard", icon: Navigation, permission: "dashboard.view", group: "Overview" },
  { key: "marketplace-admin", label: "Marketplace Admin", icon: ShieldCheck, permission: "settings.manage", group: "Overview" },
  { key: "marketplace-analytics", label: "Marketplace Analytics", icon: TrendingUp, permission: "settings.manage", group: "Overview" },
  { key: "patients", label: "Patients", icon: Users, permission: "patients.read", group: "Clinical" },
  { key: "patient-portal", label: "Patient Portal", icon: UserCircle, permission: "patients.read", group: "Clinical" },
  { key: "appointments", label: "Appointments", icon: CalendarClock, permission: "appointments.read", group: "Clinical" },
  { key: "orders", label: "Test Orders", icon: ClipboardList, permission: "orders.read", group: "Clinical" },
  { key: "home-collection", label: "Home Collection", icon: MapPin, permission: "orders.read", group: "Clinical" },
  { key: "samples", label: "Sample Collection", icon: TestTube2, permission: "samples.read", group: "Laboratory" },
  { key: "barcodes", label: "Barcode Labels", icon: Printer, permission: "samples.read", group: "Laboratory" },
  { key: "results", label: "Result Entry", icon: Microscope, permission: "results.read", group: "Laboratory" },
  { key: "reports", label: "Reports", icon: FileText, permission: "reports.read", group: "Laboratory" },
  { key: "tests", label: "Test Catalog", icon: FlaskConical, permission: "tests.read", group: "Laboratory" },
  { key: "invoices", label: "Billing & Invoices", icon: Receipt, permission: "invoices.read", group: "Finance" },
  { key: "finance", label: "Finance Reports", icon: TrendingUp, permission: "finance.view", group: "Finance" },
  { key: "inventory", label: "Inventory", icon: Package, permission: "inventory.read", group: "Inventory" },
  { key: "purchases", label: "Purchase Orders", icon: ShoppingCart, permission: "purchases.read", group: "Inventory" },
  { key: "doctors", label: "Referring Doctors", icon: Stethoscope, permission: "doctors.read", group: "Directory" },
  { key: "doctor-portal", label: "Doctor Portal", icon: Stethoscope, permission: "doctors.read", group: "Directory" },
  { key: "commissions", label: "Commission Reports", icon: TrendingUp, permission: "doctors.read", group: "Directory" },
  { key: "audit", label: "Audit Log", icon: ScrollText, permission: "audit.view", group: "System" },
  { key: "user-management", label: "User Management", icon: Users, permission: "users.manage", group: "System" },
  { key: "feature-flags", label: "Feature Flags", icon: Settings, permission: "settings.manage", group: "System" },
  { key: "settings", label: "Settings", icon: Settings, permission: "settings.manage", group: "System" },
]
