"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { NAV_ITEMS } from "@/lib/nav"
import { api, getAuthToken, setAuthToken, clearAuthToken } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { ROLES } from "@/lib/permissions"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CommandPalette } from "@/components/command-palette"
import { Activity, Bell, Moon, Search, Sun, TestTube2, LogOut, Menu, ChevronDown, ShieldCheck, Loader2, AlertCircle, KeyRound } from "lucide-react"
import { initials, timeAgo } from "@/lib/format"
import { toast } from "sonner"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, organization, branch, setSession, setOrganization, setBranch, navigate, view, can } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
     
    setMounted(true)
  }, [])

  // Bootstrap session on mount + when auth token changes
  useEffect(() => {
    const load = async () => {
      const token = getAuthToken()
      if (!token) return
      try {
        const data = await api.get<{ user: any; organization: any; branch: any }>("/api/auth/me")
        if (data.user) {
          setSession(data.user)
          setOrganization(data.organization)
          setBranch(data.branch)
        } else {
          clearAuthToken()
        }
      } catch {
        clearAuthToken()
      }
    }
    load()
    const handler = () => load()
    window.addEventListener("lms-auth-change", handler)
    return () => window.removeEventListener("lms-auth-change", handler)
  }, [setSession, setOrganization, setBranch])

  // Notifications
  const [notifs, setNotifs] = useState<any[]>([])
  const loadNotifs = async () => {
    if (!getAuthToken()) return
    try {
      const d = await api.get<{ notifications: any[] }>("/api/notifications")
      setNotifs(d.notifications)
    } catch {}
  }
  useEffect(() => {
     
    if (session) loadNotifs()
    const h = () => session && loadNotifs()
    window.addEventListener("lms-auth-change", h)
    return () => window.removeEventListener("lms-auth-change", h)
  }, [session])

  const logout = async () => {
    try { await api.post("/api/auth/logout") } catch {}
    clearAuthToken()
    setSession(null)
    setOrganization(null)
    setBranch(null)
    toast.success("Signed out")
  }

  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" })
  const [pwLoading, setPwLoading] = useState(false)
  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) { toast.error("Fill in both fields"); return }
    if (pwForm.newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return }
    setPwLoading(true)
    try {
      await api.post("/api/auth/change-password", pwForm)
      toast.success("Password changed. Please log in again.")
      setPwOpen(false)
      setPwForm({ currentPassword: "", newPassword: "" })
      clearAuthToken()
      setSession(null)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setPwLoading(false)
    }
  }

  const grouped = NAV_ITEMS.reduce<Record<string, typeof NAV_ITEMS>>((acc, item) => {
    if (!can(item.permission)) return acc
    ;(acc[item.group] = acc[item.group] || []).push(item)
    return acc
  }, {})

  const unread = notifs.filter((n) => !n.read).length
  const markAllRead = async () => {
    await api.patch("/api/notifications", { id: "all", read: true })
    loadNotifs()
  }

  if (!session) {
    return <LoginScreen />
  }

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <TestTube2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">MediCore LMS</p>
          <p className="truncate text-xs text-muted-foreground">{organization?.name ?? "Lab"}</p>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-5 pb-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = view === item.key || (view === "patient-detail" && item.key === "patients") || (view === "order-detail" && item.key === "orders") || (view === "invoice-detail" && item.key === "invoices") || (view === "report-detail" && item.key === "reports")
                  return (
                    <button
                      key={item.key}
                      onClick={() => { navigate(item.key); setMobileOpen(false) }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
      <div className="border-t p-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(session.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{session.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{ROLES[session.role as keyof typeof ROLES] ?? session.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-sidebar lg:block">
        {SidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>

          <button
            onClick={() => useApp.getState().setPaletteOpen(true)}
            className="group flex h-9 flex-1 items-center gap-2.5 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-md"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4.5 w-4.5" />
                  {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-rose-500" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unread > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>Mark all read</Button>}
                </div>
                <ScrollArea className="h-80">
                  <div className="divide-y">
                    {notifs.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</p>}
                    {notifs.map((n) => (
                      <div key={n.id} className={cn("flex gap-3 px-4 py-3", !n.read && "bg-primary/5")}>
                        <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", n.type === "CRITICAL" ? "bg-rose-500" : n.type === "WARNING" ? "bg-amber-500" : n.type === "SUCCESS" ? "bg-emerald-500" : "bg-blue-500")} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {mounted && theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-1.5 sm:px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(session.name)}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-medium leading-tight">{session.name}</p>
                    <p className="text-[11px] leading-tight text-muted-foreground">{ROLES[session.role as keyof typeof ROLES] ?? session.role}</p>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">{session.email}</p>
                    <Badge variant="secondary" className="mt-1.5 w-fit gap-1 text-[10px]"><ShieldCheck className="h-2.5 w-2.5" /> {ROLES[session.role as keyof typeof ROLES] ?? session.role}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPwOpen(true)}>
                  <KeyRound className="mr-2 h-3.5 w-3.5" /> Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-600">
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>

        <footer className="mt-auto border-t bg-background/50 px-6 py-4">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>MediCore LMS · Open-source Pathology Laboratory Management System</p>
            <p className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> System operational · v2.0</p>
          </div>
        </footer>
      </div>

      <CommandPalette />

      {/* Change Password Dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">For security, you'll be logged out after changing your password.</p>
            <div>
              <Label className="mb-1 block text-xs">Current Password</Label>
              <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1 block text-xs">New Password <span className="text-muted-foreground">(min 8 chars)</span></Label>
              <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={changePassword} disabled={pwLoading}>{pwLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Real login screen (email + password) ──
function LoginScreen() {
  const { setSession, setOrganization, setBranch } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError("Enter email and password"); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ token: string; user: any; organization: any; branch: any }>("/api/auth/login", { email, password })
      setAuthToken(res.token)
      setSession(res.user)
      setOrganization(res.organization)
      setBranch(res.branch)
      toast.success(`Welcome back, ${res.user.name}`)
    } catch (e: any) {
      setError(e.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid p-6">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <TestTube2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MediCore LMS</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pathology Laboratory Management System</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input id="email" type="email" placeholder="you@lab.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <p>Secure login · Passwords hashed with bcrypt · Token-based sessions</p>
          <button
            onClick={() => { window.location.href = "/?register=1" }}
            className="text-primary hover:underline"
          >
            New patient? Register here →
          </button>
        </div>
      </div>
    </div>
  )
}
