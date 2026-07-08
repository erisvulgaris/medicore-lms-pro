"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, EmptyState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Truck,
  Plus,
  Trash2,
  Loader2,
  Package,
  Building2,
  Phone,
  Mail,
  Hash,
  ShoppingCart,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Supplier = {
  id: string
  name: string
  code: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  gstin: string | null
}

type PurchaseOrder = {
  id: string
  poCode: string
  status: string
  totalAmount: number
  orderDate: string
  receivedDate: string | null
  notes: string | null
  supplier: { name: string }
  _count?: { items: number }
  items?: { id: string }[]
}

const PO_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  PARTIAL: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
}

export function PurchasesView() {
  const { can } = useApp()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get<{ suppliers: Supplier[]; purchaseOrders: PurchaseOrder[] }>(`/api/suppliers`),
  })

  const suppliers = data?.suppliers ?? []
  const purchaseOrders = data?.purchaseOrders ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage suppliers and procurement"
        actions={
          can("purchases.write") && (
            <CreatePODialog open={createOpen} onOpenChange={setCreateOpen} suppliers={suppliers} />
          )
        }
      />

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Building2 className="mr-1.5 h-3.5 w-3.5" /> Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : !purchaseOrders.length ? (
              <EmptyState
                icon={Truck}
                title="No purchase orders yet"
                description="Create a PO to restock reagents, consumables, or supplies from your suppliers."
                action={
                  can("purchases.write") && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> New PO
                    </Button>
                  )
                }
              />
            ) : (
              <ScrollArea className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Code</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Order date</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => {
                      const itemCount = po._count?.items ?? po.items?.length ?? 0
                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono text-xs">{po.poCode}</TableCell>
                          <TableCell className="font-medium">{po.supplier?.name ?? "—"}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium", PO_STATUS_STYLES[po.status] || "bg-muted text-muted-foreground")}>
                              {po.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(po.totalAmount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(po.orderDate)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{po.receivedDate ? formatDate(po.receivedDate) : "—"}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{itemCount}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : !suppliers.length ? (
              <EmptyState
                icon={Building2}
                title="No suppliers configured"
                description="Suppliers are managed via database seeding. Contact your administrator to add new suppliers."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="truncate font-medium">{s.name}</p>
                            {s.code && <p className="font-mono text-[11px] text-muted-foreground">{s.code}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs">
                      {s.contactPerson && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-3 w-3" /> <span className="text-foreground">{s.contactPerson}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3 w-3" /> <span className="text-foreground">{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" /> <span className="text-foreground">{s.email}</span>
                        </div>
                      )}
                      {s.gstin && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hash className="h-3 w-3" /> <span className="font-mono text-foreground">{s.gstin}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

type LineItem = { itemName: string; quantity: string; rate: string }

function CreatePODialog({
  open,
  onOpenChange,
  suppliers,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  suppliers: Supplier[]
}) {
  const qc = useQueryClient()
  const [supplierId, setSupplierId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<LineItem[]>([
    { itemName: "", quantity: "1", rate: "0" },
  ])
  const [saving, setSaving] = useState(false)

  const total = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0)

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const addItem = () => setItems([...items, { itemName: "", quantity: "1", rate: "0" }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const submit = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier")
      return
    }
    const cleanItems = items.filter((i) => i.itemName.trim())
    if (!cleanItems.length) {
      toast.error("Add at least one line item")
      return
    }
    setSaving(true)
    try {
      await api.post("/api/purchase-orders", {
        supplierId,
        items: cleanItems.map((i) => ({
          itemName: i.itemName.trim(),
          quantity: Number(i.quantity) || 0,
          rate: Number(i.rate) || 0,
        })),
        notes: notes.trim() || undefined,
      })
      toast.success("Purchase order created")
      qc.invalidateQueries({ queryKey: ["suppliers"] })
      onOpenChange(false)
      setSupplierId("")
      setNotes("")
      setItems([{ itemName: "", quantity: "1", rate: "0" }])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create PO")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New PO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create purchase order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-6"
                    placeholder="Item name"
                    value={it.itemName}
                    onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    placeholder="Rate"
                    value={it.rate}
                    onChange={(e) => updateItem(idx, { rate: e.target.value })}
                  />
                  <div className="col-span-1 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <div className="w-1/2 rounded-lg bg-muted/40 px-3 py-2 text-right text-xs">
                <span className="text-muted-foreground">Line amount: </span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</Label>
            <Input
              placeholder="Delivery instructions, payment terms, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">PO Total</span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create PO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
