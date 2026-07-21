"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useApp } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

// Lazy-load views so Turbopack compiles them on-demand (one at a time),
// drastically reducing peak memory during the initial compile.
const DashboardView = dynamic(() => import("@/components/views/dashboard-view").then(m => ({ default: m.DashboardView })), { ssr: false })
const QuickLabView = dynamic(() => import("@/components/views/quick-lab-view").then(m => ({ default: m.QuickLabView })), { ssr: false })
const AnalyticsView = dynamic(() => import("@/components/views/analytics-view").then(m => ({ default: m.AnalyticsView })), { ssr: false })
const TechniciansView = dynamic(() => import("@/components/views/technicians-view").then(m => ({ default: m.TechniciansView })), { ssr: false })
const FinanceView = dynamic(() => import("@/components/views/finance-view").then(m => ({ default: m.FinanceView })), { ssr: false })
const CommissionsView = dynamic(() => import("@/components/views/commissions-view").then(m => ({ default: m.CommissionsView })), { ssr: false })
const HomeCollectionView = dynamic(() => import("@/components/views/home-collection-view").then(m => ({ default: m.HomeCollectionView })), { ssr: false })
const BarcodesView = dynamic(() => import("@/components/views/barcodes-view").then(m => ({ default: m.BarcodesView })), { ssr: false })
const PatientPortalView = dynamic(() => import("@/components/views/patient-portal-view").then(m => ({ default: m.PatientPortalView })), { ssr: false })
const DoctorPortalView = dynamic(() => import("@/components/views/doctor-portal-view").then(m => ({ default: m.DoctorPortalView })), { ssr: false })
const PatientsView = dynamic(() => import("@/components/views/patients-view").then(m => ({ default: m.PatientsView })), { ssr: false })
const PatientDetail = dynamic(() => import("@/components/views/patient-detail").then(m => ({ default: m.PatientDetail })), { ssr: false })
const TestsView = dynamic(() => import("@/components/views/tests-view").then(m => ({ default: m.TestsView })), { ssr: false })
const AppointmentsView = dynamic(() => import("@/components/views/appointments-view").then(m => ({ default: m.AppointmentsView })), { ssr: false })
const OrdersView = dynamic(() => import("@/components/views/orders-view").then(m => ({ default: m.OrdersView })), { ssr: false })
const OrderDetail = dynamic(() => import("@/components/views/order-detail").then(m => ({ default: m.OrderDetail })), { ssr: false })
const SamplesView = dynamic(() => import("@/components/views/samples-view").then(m => ({ default: m.SamplesView })), { ssr: false })
const ResultsView = dynamic(() => import("@/components/views/results-view").then(m => ({ default: m.ResultsView })), { ssr: false })
const ReportsView = dynamic(() => import("@/components/views/reports-view").then(m => ({ default: m.ReportsView })), { ssr: false })
const ReportDetail = dynamic(() => import("@/components/views/report-detail").then(m => ({ default: m.ReportDetail })), { ssr: false })
const InvoicesView = dynamic(() => import("@/components/views/invoices-view").then(m => ({ default: m.InvoicesView })), { ssr: false })
const InvoiceDetail = dynamic(() => import("@/components/views/invoice-detail").then(m => ({ default: m.InvoiceDetail })), { ssr: false })
const InventoryView = dynamic(() => import("@/components/views/inventory-view").then(m => ({ default: m.InventoryView })), { ssr: false })
const PurchasesView = dynamic(() => import("@/components/views/purchases-view").then(m => ({ default: m.PurchasesView })), { ssr: false })
const DoctorsView = dynamic(() => import("@/components/views/doctors-view").then(m => ({ default: m.DoctorsView })), { ssr: false })
const AuditView = dynamic(() => import("@/components/views/audit-view").then(m => ({ default: m.AuditView })), { ssr: false })
const UserManagementView = dynamic(() => import("@/components/views/user-management-view").then(m => ({ default: m.UserManagementView })), { ssr: false })
const SettingsView = dynamic(() => import("@/components/views/settings-view").then(m => ({ default: m.SettingsView })), { ssr: false })
const VerifyView = dynamic(() => import("@/components/views/verify-view").then(m => ({ default: m.VerifyView })), { ssr: false })
const PublicRegisterView = dynamic(() => import("@/components/views/public-register-view").then(m => ({ default: m.PublicRegisterView })), { ssr: false })
const MarketplaceDiscoverView = dynamic(() => import("@/components/views/marketplace-discover-view").then(m => ({ default: m.MarketplaceDiscoverView })), { ssr: false })
const MarketplaceLabDetailView = dynamic(() => import("@/components/views/marketplace-lab-detail-view").then(m => ({ default: m.MarketplaceLabDetailView })), { ssr: false })
const MarketplaceCartView = dynamic(() => import("@/components/views/marketplace-cart-view").then(m => ({ default: m.MarketplaceCartView })), { ssr: false })
const MarketplaceOrdersView = dynamic(() => import("@/components/views/marketplace-orders-view").then(m => ({ default: m.MarketplaceOrdersView })), { ssr: false })
const FeatureFlagsView = dynamic(() => import("@/components/views/feature-flags-view").then(m => ({ default: m.FeatureFlagsView })), { ssr: false })
const LabOwnerDashboardView = dynamic(() => import("@/components/views/lab-owner-dashboard-view").then(m => ({ default: m.LabOwnerDashboardView })), { ssr: false })
const MarketplaceAdminView = dynamic(() => import("@/components/views/marketplace-admin-view").then(m => ({ default: m.MarketplaceAdminView })), { ssr: false })

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}

export default function Home() {
  const { view, session } = useApp()
  const [verifyToken, setVerifyToken] = useState<string | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [marketplace, setMarketplace] = useState<string | null>(null)
  const [marketplaceSlug, setMarketplaceSlug] = useState<string | null>(null)
  const [marketplaceSession, setMarketplaceSession] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("verify")
    const reg = params.get("register")
    const mp = params.get("marketplace")
    const slug = params.get("slug")
    const sid = params.get("sessionId")
     
    if (token) setVerifyToken(token)
     
    if (reg === "1") setShowRegister(true)
     
    if (mp) { setMarketplace(mp); setMarketplaceSlug(slug); setMarketplaceSession(sid || "") }
  }, [])

  if (verifyToken) {
    return (
      <div className="min-h-screen bg-background">
        <VerifyView token={verifyToken} />
      </div>
    )
  }

  if (showRegister) {
    return <PublicRegisterView />
  }

  if (marketplace === "1") return <MarketplaceDiscoverView />
  if (marketplace === "lab" && marketplaceSlug) return <MarketplaceLabDetailView slug={marketplaceSlug} />
  if (marketplace === "cart") return <MarketplaceCartView sessionId={marketplaceSession || `session-${Date.now()}`} />
  if (marketplace === "orders") return <MarketplaceOrdersView sessionId={marketplaceSession} />

  if (!session) {
    return <AppShell><div /></AppShell>
  }

  return (
    <AppShell>
      <ViewRouter view={view} />
    </AppShell>
  )
}

function ViewRouter({ view }: { view: string }) {
  switch (view) {
    case "dashboard": return <DashboardView />
    case "quick-lab": return <QuickLabView />
    case "analytics": return <AnalyticsView />
    case "technicians": return <TechniciansView />
    case "lab-owner": return <LabOwnerDashboardView />
    case "marketplace-admin": return <MarketplaceAdminView />
    case "finance": return <FinanceView />
    case "commissions": return <CommissionsView />
    case "home-collection": return <HomeCollectionView />
    case "barcodes": return <BarcodesView />
    case "patient-portal": return <PatientPortalView />
    case "doctor-portal": return <DoctorPortalView />
    case "patients": return <PatientsView />
    case "patient-detail": return <PatientDetail />
    case "tests": return <TestsView />
    case "appointments": return <AppointmentsView />
    case "orders": return <OrdersView />
    case "order-detail": return <OrderDetail />
    case "samples": return <SamplesView />
    case "results": return <ResultsView />
    case "reports": return <ReportsView />
    case "report-detail": return <ReportDetail />
    case "invoices": return <InvoicesView />
    case "invoice-detail": return <InvoiceDetail />
    case "inventory": return <InventoryView />
    case "purchases": return <PurchasesView />
    case "doctors": return <DoctorsView />
    case "audit": return <AuditView />
    case "user-management": return <UserManagementView />
    case "feature-flags": return <FeatureFlagsView />
    case "settings": return <SettingsView />
    default: return <DashboardView />
  }
}
