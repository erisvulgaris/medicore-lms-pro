"use client"

import { create } from "zustand"
import type { Permission } from "@/lib/permissions"
import { hasPermission } from "@/lib/permissions"

export interface SessionInfo {
  id: string
  organizationId: string
  branchId: string | null
  name: string
  email: string
  role: string
}

export interface OrgInfo {
  id: string
  name: string
  code: string
  accentColor: string | null
  logoUrl: string | null
  city: string | null
  gstin: string | null
}

interface AppState {
  session: SessionInfo | null
  organization: OrgInfo | null
  branch: { id: string; name: string; code: string } | null
  view: string
  viewParam: string | null
  paletteOpen: boolean
  setSession: (s: SessionInfo | null) => void
  setOrganization: (o: OrgInfo | null) => void
  setBranch: (b: AppState["branch"]) => void
  navigate: (view: string, param?: string | null) => void
  setPaletteOpen: (open: boolean) => void
  can: (permission: Permission) => boolean
}

export const useApp = create<AppState>((set, get) => ({
  session: null,
  organization: null,
  branch: null,
  view: "dashboard",
  viewParam: null,
  paletteOpen: false,
  setSession: (s) => set({ session: s }),
  setOrganization: (o) => set({ organization: o }),
  setBranch: (b) => set({ branch: b }),
  navigate: (view, param = null) => set({ view, viewParam: param, paletteOpen: false }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  can: (permission) => {
    const s = get().session
    if (!s) return false
    return hasPermission(s.role, permission)
  },
}))
