"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api-client"
import { useApp } from "@/lib/store"
import { PageHeader, StatCard, EmptyState } from "@/components/shared"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Users, UserPlus, Loader2, ShieldCheck, ShieldOff, KeyRound, Search, Copy, CheckCircle2, Mail, Phone, Clock } from "lucide-react"
import { ROLES } from "@/lib/permissions"
import { initials, formatDate, timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function UserManagementView() {
  const { session } = useApp()
  const qc = useQueryClient()
  const [q, setQ] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["users-mgmt"],
    queryFn: () => api.get<{ users: any[]; branches: any[] }>("/api/users"),
  })

  const users = (data?.users ?? []).filter((u) =>
    !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.role.toLowerCase().includes(q.toLowerCase())
  )

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/api/users/${id}`, { active }),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["users-mgmt"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => api.patch(`/api/users/${id}`, { resetPassword: password }),
    onSuccess: (d: any) => { toast.success("Password reset"); if (d.newPassword) setCreatedCreds({ email: "", password: d.newPassword }) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => { toast.success("User disabled"); qc.invalidateQueries({ queryKey: ["users-mgmt"] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const copyCreds = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeCount = (data?.users ?? []).filter((u) => u.active).length
  const disabledCount = (data?.users ?? []).filter((u) => !u.active).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create, manage, and disable user accounts with role-based access"
        actions={<CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} branches={data?.branches ?? []} onCreated={(creds) => setCreatedCreds(creds)} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={data?.users.length ?? 0} icon={Users} accent="blue" />
        <StatCard label="Active" value={activeCount} icon={ShieldCheck} accent="emerald" />
        <StatCard label="Disabled" value={disabledCount} icon={ShieldOff} accent="rose" />
        <StatCard label="Roles" value={Object.keys(ROLES).length} icon={KeyRound} accent="violet" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, email, or role…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {/* Users table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <div className="divide-y">
              {users.map((u) => {
                const isSelf = u.id === session?.id
                const roleLabel = ROLES[u.role as keyof typeof ROLES] ?? u.role
                return (
                  <div key={u.id} className={cn("flex items-center gap-3 px-4 py-3", !u.active && "opacity-60")}>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={cn("text-xs font-semibold", u.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        {isSelf && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                        {!u.active && <Badge variant="outline" className="border-rose-300 text-[10px] text-rose-700 dark:border-rose-800 dark:text-rose-400">Disabled</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</span>
                        {u.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone}</span>}
                        {u.branch && <span>· {u.branch.name}</span>}
                        {u.lastLoginAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last login {timeAgo(u.lastLoginAt)}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">{roleLabel}</Badge>
                    <div className="flex items-center gap-1">
                      <ResetPasswordDialog userId={u.id} userName={u.name} onReset={(pw) => resetPassword.mutate({ id: u.id, password: pw })} loading={resetPassword.isPending} />
                      <Switch
                        checked={u.active}
                        disabled={isSelf}
                        onCheckedChange={(v) => toggleActive.mutate({ id: u.id, active: v })}
                        title={isSelf ? "Cannot disable yourself" : undefined}
                      />
                      {!isSelf && u.active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Disable user">
                              <ShieldOff className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disable {u.name}?</AlertDialogTitle>
                              <AlertDialogDescription>This will revoke all their sessions and prevent login. The account can be re-enabled later.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser.mutate(u.id)} className="bg-rose-600 hover:bg-rose-700">Disable</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Show created credentials dialog */}
      {createdCreds && (
        <Dialog open={!!createdCreds} onOpenChange={(v) => !v && setCreatedCreds(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> User Created</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Share these credentials securely. The password will not be shown again.</p>
              <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <code className="text-sm font-mono">{createdCreds.email || "—"}</code>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono">{createdCreds.password}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCreds(`${createdCreds.email}\n${createdCreds.password}`)}>
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setCreatedCreds(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CreateUserDialog({ open, onOpenChange, branches, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; branches: any[]; onCreated: (creds: { email: string; password: string }) => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: "", email: "", role: "RECEPTIONIST", branchId: "", phone: "", password: "" })
  const [saving, setSaving] = useState(false)

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#"
    let pw = ""
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    setForm({ ...form, password: pw })
  }

  const submit = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("Name, email, and password are required"); return }
    setSaving(true)
    try {
      const res = await api.post<{ user: any; password: string }>("/api/users", { ...form, branchId: form.branchId || undefined })
      toast.success(`User ${res.user.email} created`)
      qc.invalidateQueries({ queryKey: ["users-mgmt"] })
      onCreated({ email: res.user.email, password: res.password })
      setForm({ name: "", email: "", role: "RECEPTIONIST", branchId: "", phone: "", password: "" })
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Add User</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div><Label className="mb-1 block text-xs">Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" /></div>
          <div><Label className="mb-1 block text-xs">Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@lab.com" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1 block text-xs">Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
            </div>
            <div><Label className="mb-1 block text-xs">Branch</Label>
              <Select value={form.branchId} onValueChange={(v) => setForm({ ...form, branchId: v })}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div><Label className="mb-1 block text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" /></div>
          <div>
            <Label className="mb-1 block text-xs">Password * <span className="text-muted-foreground">(min 8 chars)</span></Label>
            <div className="flex gap-2">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a password" />
              <Button variant="outline" size="sm" onClick={generatePassword}><KeyRound className="mr-1 h-3.5 w-3.5" /> Generate</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ userId, userName, onReset, loading }: { userId: string; userName: string; onReset: (pw: string) => void; loading: boolean }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")

  const generate = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#"
    let pw = ""
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    setPassword(pw)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8" title="Reset password"><KeyRound className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Reset Password — {userName}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">This will revoke all existing sessions for this user. They will need to log in with the new password.</p>
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 chars)" />
            <Button variant="outline" size="sm" onClick={generate}><KeyRound className="mr-1 h-3.5 w-3.5" /> Generate</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onReset(password); setOpen(false); setPassword("") }} disabled={loading || password.length < 8}>Reset Password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
