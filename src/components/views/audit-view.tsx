"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { PageHeader, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ScrollText,
  Search,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ArrowLeftRight,
  Activity,
} from "lucide-react"
import { formatDateTime, timeAgo, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type AuditLog = {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  user: { name: string; role: string } | null
}

type ActionCategory = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "OTHER"

function categorize(action: string): ActionCategory {
  const a = action.toUpperCase()
  if (a === "CREATE" || a === "STOCK_ADJUST" || a.startsWith("CREATE_")) return "CREATE"
  if (a === "UPDATE" || a === "PUT") return "UPDATE"
  if (a === "DELETE" || a === "REMOVE") return "DELETE"
  if (a.startsWith("STATUS_") || a === "ADVANCE" || a === "REJECT" || a === "APPROVE" || a === "VERIFY") return "STATUS_CHANGE"
  return "OTHER"
}

const ACTION_META: Record<ActionCategory, { dot: string; ring: string; label: string; icon: typeof Plus }> = {
  CREATE: { dot: "bg-emerald-500", ring: "border-l-emerald-500", label: "Create", icon: Plus },
  UPDATE: { dot: "bg-blue-500", ring: "border-l-blue-500", label: "Update", icon: Pencil },
  DELETE: { dot: "bg-rose-500", ring: "border-l-rose-500", label: "Delete", icon: Trash2 },
  STATUS_CHANGE: { dot: "bg-violet-500", ring: "border-l-violet-500", label: "Status", icon: ArrowLeftRight },
  OTHER: { dot: "bg-slate-400", ring: "border-l-slate-400", label: "Other", icon: Activity },
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  ORG_OWNER: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  BRANCH_ADMIN: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PATHOLOGIST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  LAB_TECHNICIAN: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  RECEPTIONIST: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CASHIER: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  ACCOUNTANT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
  DOCTOR: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PHLEBOTOMIST: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
}

export function AuditView() {
  const [entity, setEntity] = useState("ALL")
  const [q, setQ] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["audit", 200],
    queryFn: () => api.get<{ logs: AuditLog[] }>(`/api/audit?limit=200`),
  })

  const logs = data?.logs ?? []

  const entities = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => set.add(l.entity))
    return Array.from(set).sort()
  }, [logs])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return logs.filter((l) => {
      if (entity !== "ALL" && l.entity !== entity) return false
      if (!needle) return true
      return (
        l.action.toLowerCase().includes(needle) ||
        (l.details?.toLowerCase().includes(needle) ?? false) ||
        (l.user?.name?.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [logs, entity, q])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of all system actions"
        actions={
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs">
            <RefreshCw className="h-3 w-3" /> Last 200 entries
          </Badge>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by action, details, or user…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entities</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !filtered.length ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries match"
            description="Try clearing filters or adjusting your search query."
          />
        ) : (
          <ScrollArea className="max-h-[75vh]">
            <ol className="relative">
              {filtered.map((log, idx) => {
                const cat = categorize(log.action)
                const meta = ACTION_META[cat]
                const Icon = meta.icon
                const roleStyle = log.user ? ROLE_BADGE[log.user.role] || "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                return (
                  <li
                    key={log.id}
                    className={cn(
                      "relative flex gap-4 border-l-2 px-4 py-4 transition-colors hover:bg-muted/40",
                      meta.ring,
                      idx === filtered.length - 1 && "border-b-0"
                    )}
                  >
                    <div className="relative -ml-[1.4rem] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-white", meta.dot)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {log.user?.name ?? "System"}
                        </span>
                        {log.user && (
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", roleStyle)}>
                            {log.user.role.replace(/_/g, " ")}
                          </span>
                        )}
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium", "bg-muted text-muted-foreground")}>
                          <Icon className="h-2.5 w-2.5" /> {log.action}
                        </span>
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {log.entity}
                        </span>
                      </div>
                      {log.details && (
                        <p className="mt-1 text-sm text-muted-foreground">{log.details}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{formatDateTime(log.createdAt)}</span>
                        <span>· {timeAgo(log.createdAt)}</span>
                        {log.ipAddress && <span>· IP {log.ipAddress}</span>}
                        {log.entityId && (
                          <span className="font-mono">· {log.entityId.slice(-8)}</span>
                        )}
                      </div>
                    </div>

                    {!log.user && (
                      <div className="hidden shrink-0 self-start sm:block">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">SYS</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}
