"use client"

import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useApp } from "@/lib/store"
import { NAV_ITEMS } from "@/lib/nav"
import { api } from "@/lib/api-client"
import { Users, ClipboardList, Receipt, Stethoscope, FileText, Search, ArrowRight } from "lucide-react"

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  meta: string
}

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen)
  const setOpen = useApp((s) => s.setPaletteOpen)
  const navigate = useApp((s) => s.navigate)
  const can = useApp((s) => s.can)
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, setOpen])

  const onSearch = async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([])
      return
    }
    try {
      const data = await api.get<{ results: Record<string, SearchResult[]> }>(`/api/search?q=${encodeURIComponent(q)}`)
      const all = Object.values(data.results).flat()
      setResults(all)
    } catch {
      setResults([])
    }
  }

  const iconFor = (type: string) => {
    switch (type) {
      case "patient": return Users
      case "order": return ClipboardList
      case "invoice": return Receipt
      case "doctor": return Stethoscope
      case "report": return FileText
      default: return Search
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search patients, orders, invoices, or jump to…" onValueChange={onSearch} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Search results">
            {results.map((r) => {
              const Icon = iconFor(r.type)
              return (
                <CommandItem
                  key={`${r.type}-${r.id}`}
                  value={`${r.type} ${r.title} ${r.subtitle}`}
                  onSelect={() => {
                    if (r.type === "patient") navigate("patient-detail", r.id)
                    else if (r.type === "order") navigate("order-detail", r.id)
                    else if (r.type === "invoice") navigate("invoice-detail", r.id)
                    else if (r.type === "report") navigate("report-detail", r.id)
                    else if (r.type === "doctor") navigate("doctors")
                  }}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 items-center justify-between">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.subtitle}{r.meta ? ` · ${r.meta}` : ""}</span>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Navigation">
          {NAV_ITEMS.filter((n) => can(n.permission)).map((item) => (
            <CommandItem key={item.key} value={`go ${item.label}`} onSelect={() => navigate(item.key)}>
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Quick actions">
          <CommandItem value="new patient register" onSelect={() => navigate("patients", "new")}>
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            Register new patient
          </CommandItem>
          <CommandItem value="new order register test" onSelect={() => navigate("orders", "new")}>
            <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
            Create new test order
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
