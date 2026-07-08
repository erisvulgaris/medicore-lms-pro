"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  CalendarClock,
  IndianRupee,
  Package,
  Loader2,
  SlidersHorizontal,
} from "lucide-react"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { INVENTORY_CATEGORIES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type InventoryItem = {
  id: string
  name: string
  code: string
  category: string
  unit: string
  stockQty: number
  reorderLevel: number
  reorderQty: number
  costPerUnit: number
  expiryDate: string | null
  batchNo: string | null
  location: string | null
}

const CATEGORY_STYLES: Record<string, string> = {
  REAGENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CONSUMABLE: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  EQUIPMENT: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
}

const EXPIRY_WINDOW_DAYS = 60

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function InventoryView() {
  const { can } = useApp()
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("ALL")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const query = `?q=${encodeURIComponent(q)}&category=${category}&lowStock=${lowStockOnly}`

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", q, category, lowStockOnly],
    queryFn: () => api.get<{ items: InventoryItem[] }>(`/api/inventory${query}`),
  })

  const items = data?.items ?? []
  const totalItems = items.length
  const lowStockCount = items.filter((i) => i.stockQty <= i.reorderLevel).length
  const expiringSoon = items.filter((i) => {
    const d = daysUntil(i.expiryDate)
    return d !== null && d >= 0 && d <= EXPIRY_WINDOW_DAYS
  }).length
  const totalValue = items.reduce((s, i) => s + i.stockQty * i.costPerUnit, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Reagents, consumables, and equipment"
        actions={
          can("inventory.write") && (
            <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Items" value={formatNumber(totalItems)} icon={Boxes} accent="emerald" />
        <StatCard label="Low Stock" value={formatNumber(lowStockCount)} icon={AlertTriangle} accent={lowStockCount > 0 ? "rose" : "emerald"} />
        <StatCard label="Expiring ≤ 60d" value={formatNumber(expiringSoon)} icon={CalendarClock} accent={expiringSoon > 0 ? "amber" : "emerald"} />
        <StatCard label="Stock Value" value={formatCurrency(totalValue)} icon={IndianRupee} accent="emerald" />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[170px]">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {INVENTORY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
              <Switch checked={lowStockOnly} onCheckedChange={setLowStockOnly} id="lowstock" />
              <Label htmlFor="lowstock" className="cursor-pointer text-xs font-medium">
                Low stock only
              </Label>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState
            icon={Package}
            title="No inventory items"
            description="Add reagents, consumables, or equipment to start tracking stock levels."
            action={
              can("inventory.write") && (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              )
            }
          />
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Location</TableHead>
                  {can("inventory.write") && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => {
                  const days = daysUntil(i.expiryDate)
                  const expired = days !== null && days < 0
                  const expiringSoon = days !== null && days >= 0 && days <= EXPIRY_WINDOW_DAYS
                  const isLow = i.stockQty <= i.reorderLevel
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium">{i.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{i.code}</div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium", CATEGORY_STYLES[i.category] || "bg-muted text-muted-foreground")}>
                          {i.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("font-medium", isLow && "text-rose-600 dark:text-rose-400")}>
                          {formatNumber(i.stockQty)}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">{i.unit}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm", isLow && "font-semibold text-rose-600 dark:text-rose-400")}>
                          {formatNumber(i.reorderLevel)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{formatCurrency(i.costPerUnit)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(i.stockQty * i.costPerUnit)}</TableCell>
                      <TableCell>
                        {i.expiryDate ? (
                          <span
                            className={cn(
                              "text-xs",
                              expired && "font-medium text-rose-600 dark:text-rose-400",
                              expiringSoon && !expired && "font-medium text-amber-600 dark:text-amber-400",
                              !expired && !expiringSoon && "text-muted-foreground"
                            )}
                          >
                            {formatDate(i.expiryDate)}
                            {expired && <span className="ml-1">· Expired</span>}
                            {expiringSoon && !expired && <span className="ml-1">· Soon</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{i.location || "—"}</TableCell>
                      {can("inventory.write") && (
                        <TableCell className="text-right">
                          <AdjustDialog item={i} />
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </div>
  )
}

function AdjustDialog({ item }: { item: InventoryItem }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(String(item.stockQty))
  const [reason, setReason] = useState("")

  const mutation = useMutation({
    mutationFn: (body: { stockQty: number; type: string; reason: string }) =>
      api.patch(`/api/inventory/${item.id}`, body),
    onSuccess: () => {
      toast.success("Stock adjusted")
      qc.invalidateQueries({ queryKey: ["inventory"] })
      setOpen(false)
      setReason("")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const diff = Number(qty) - item.stockQty
  const type = diff > 0 ? "IN" : diff < 0 ? "OUT" : "ADJUST"

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setQty(String(item.stockQty)) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Current stock</span>
              <span className="font-medium text-foreground">{formatNumber(item.stockQty)} {item.unit}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Reorder level</span>
              <span className="font-medium text-foreground">{formatNumber(item.reorderLevel)} {item.unit}</span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">New stock quantity</Label>
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
            />
            {Number(qty) !== item.stockQty && (
              <p className={cn("mt-1.5 text-xs", diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-muted-foreground")}>
                {diff > 0 ? `+${formatNumber(diff)} ${item.unit}` : diff < 0 ? `${formatNumber(diff)} ${item.unit}` : "No change"} · {type}
              </p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Reason / notes</Label>
            <Input
              placeholder="e.g. New delivery, breakage, audit correction…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ stockQty: Number(qty), type, reason })}
            disabled={mutation.isPending || Number(qty) < 0 || Number(qty) === item.stockQty}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: "",
    code: "",
    category: "REAGENT",
    unit: "",
    stockQty: "0",
    reorderLevel: "0",
    reorderQty: "0",
    costPerUnit: "0",
    expiryDate: "",
    batchNo: "",
    location: "",
  })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.name || !form.code) {
      toast.error("Name and code are required")
      return
    }
    setSaving(true)
    try {
      await api.post("/api/inventory", {
        ...form,
        stockQty: Number(form.stockQty) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        reorderQty: Number(form.reorderQty) || 0,
        costPerUnit: Number(form.costPerUnit) || 0,
        expiryDate: form.expiryDate || null,
      })
      toast.success("Inventory item created")
      qc.invalidateQueries({ queryKey: ["inventory"] })
      onOpenChange(false)
      setForm({ name: "", code: "", category: "REAGENT", unit: "", stockQty: "0", reorderLevel: "0", reorderQty: "0", costPerUnit: "0", expiryDate: "", batchNo: "", location: "" })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add inventory item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Glucose Reagent" /></Field>
          <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. RGT-GLU-001" className="font-mono" /></Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVENTORY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. mL, pack, unit" /></Field>
          <Field label="Stock quantity"><Input type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} /></Field>
          <Field label="Reorder level"><Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} /></Field>
          <Field label="Reorder quantity"><Input type="number" value={form.reorderQty} onChange={(e) => setForm({ ...form, reorderQty: e.target.value })} /></Field>
          <Field label="Cost per unit (₹)"><Input type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} /></Field>
          <Field label="Expiry date"><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></Field>
          <Field label="Batch number"><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></Field>
          <Field label="Location" full><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Shelf / cupboard / cold storage" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
