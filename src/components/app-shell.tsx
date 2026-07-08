"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/lib/store"
import { NAV_ITEMS } from "@/lib/nav"
import { api, getDemoUserId, setDemoUserId } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { ROLES } from "@/lib/permissions"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CommandPalette } from "@/components/command-palette"
import { Activity, Bell, Check, ChevronDown, LogOut, Menu, Moon, Search, Sun, Stethoscope, TestTube2, UserCircle } from "lucide-react"
import { initials, timeAgo } from "@/lib/format"
import { toast } from "sonner"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, organization, demoUsers, setSession, setOrganization, setDemoUsers, navigate, view, can } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // bootstrap session
  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<{ user: typeof session; organization: typeof organization; demoUsers?: typeof demoUsers }>("/api/session")
        if (data.user) {
          setSession(data.user)
          setOrganization(data.organization)
        } else if (data.demoUsers) {
          setDemoUsers(data.demoUsers)
          setOrganization(data.organization)
        }
      } catch {
        // ignore
      }
    }
    load()
    const handler = () => load()
    window.addEventListener("lms-user-change", handler)
    return () => window.removeEventListener("lms-user-change", handler)
  }, [setSession, setOrganization, setDemoUsers])

  // notifications
  const [notifs, setNotifs] = useState<any[]>([])
  const loadNotifs = async () => {
    if (!getDemoUserId()) return
    try {
      const d = await api.get<{ notifications: any[] }>("/api/notifications")
      setNotifs(d.notifications)
    } catch {}
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) loadNotifs()
    const h = () => session && loadNotifs()
    window.addEventListener("lms-user-change", h)
    return () => window.removeEventListener("lms-user-change", h)
  }, [session])

  const switchUser = async (id: string, name: string) => {
    setDemoUserId(id)
    toast.success(`Signed in as ${name}`)
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
    return <RoleGate demoUsers={demoUsers} orgName={organization?.name} onPick={switchUser} />
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
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-sidebar lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
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
            {/* Notifications */}
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

            {/* Theme */}
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {mounted && theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>

            {/* User menu */}
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
                    <Badge variant="secondary" className="mt-1.5 w-fit text-[10px]">{ROLES[session.role as keyof typeof ROLES] ?? session.role}</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Switch role (demo)</DropdownMenuLabel>
                <ScrollArea className="h-56">
                  <div className="px-1">
                    {demoUsers.map((u) => (
                      <DropdownMenuItem key={u.id} onClick={() => switchUser(u.id, u.name)} className="gap-2 py-1.5">
                        <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex flex-1 flex-col">
                          <span className="text-xs font-medium">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground">{ROLES[u.role as keyof typeof ROLES] ?? u.role}</span>
                        </div>
                        {u.id === session.id && <Check className="h-3.5 w-3.5 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </ScrollArea>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setDemoUserId(""); window.location.reload() }} className="text-rose-600 focus:text-rose-600">
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
            <p className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> System operational · v1.0</p>
          </div>
        </footer>
      </div>

      <CommandPalette />
    </div>
  )
}

// Role selection gate (demo) — shown when no user is selected
function RoleGate({ demoUsers, orgName, onPick }: { demoUsers: { id: string; name: string; email: string; role: string }[]; orgName?: string; onPick: (id: string, name: string) => void }) {
  const { navigate } = useApp()
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid p-6">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <TestTube2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">MediCore LMS</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{orgName ? `${orgName} · ` : ""}Pathology Laboratory Management System</p>
          <p className="mt-4 text-sm text-muted-foreground">Choose a role to explore the demo. Each role sees a permission-scoped view of the system.</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {demoUsers.map((u) => {
            const Icon = roleIcon(u.role)
            return (
              <button
                key={u.id}
                onClick={() => onPick(u.id, u.name)}
                className="group flex items-center gap-3.5 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{ROLES[u.role as keyof typeof ROLES] ?? u.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            )
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo environment · Multi-tenant · RBAC enforced at API layer · Tenant-isolated queries
        </p>
      </div>
    </div>
  )
}

function roleIcon(role: string) {
  switch (role) {
    case "ORG_OWNER": return Activity
    case "PATHOLOGIST": return TestTube2
    case "DOCTOR": return Stethoscope
    default: return UserCircle
  }
}
