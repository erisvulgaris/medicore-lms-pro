import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

// Feature flag definitions — the Super Admin controls these via the admin panel.
export const FEATURE_FLAGS = {
  MARKETPLACE: { key: "marketplace", label: "Marketplace", description: "Enable the public marketplace for lab discovery and online ordering" },
  HOME_COLLECTION: { key: "home_collection", label: "Home Collection", description: "Allow customers to request home sample collection" },
  ONLINE_PAYMENTS: { key: "online_payments", label: "Online Payments", description: "Accept online payments via payment gateway" },
  COD: { key: "cod", label: "Cash on Delivery", description: "Allow cash payment on sample collection" },
  PICKUP_SYSTEM: { key: "pickup_system", label: "Pickup System", description: "Enable pickup agent assignment and logistics" },
  REFERRAL_PROGRAM: { key: "referral_program", label: "Referral Program", description: "Enable customer referral rewards" },
  DYNAMIC_PRICING: { key: "dynamic_pricing", label: "Dynamic Pricing", description: "Allow time-based and demand-based pricing rules" },
  MAINTENANCE_MODE: { key: "maintenance_mode", label: "Maintenance Mode", description: "Put the marketplace in maintenance mode (blocks ordering)" },
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS

// In-memory cache for feature flags (refreshed every 60s or on update)
let flagCache: Record<string, boolean> = {}
let cacheLoadedAt = 0

async function loadFlags() {
  try {
    const flags = await db.featureFlag.findMany()
    flagCache = {}
    for (const f of flags) flagCache[f.key] = f.enabled
    // Ensure all defined flags exist in DB
    for (const def of Object.values(FEATURE_FLAGS)) {
      if (!(def.key in flagCache)) {
        await db.featureFlag.create({ data: { key: def.key, label: def.label, description: def.description, enabled: false } })
        flagCache[def.key] = false
      }
    }
    cacheLoadedAt = Date.now()
  } catch (e) {
    logger.error("Failed to load feature flags", { error: e instanceof Error ? e.message : String(e) })
  }
}

// Check if a feature flag is enabled. Caches for 60 seconds.
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  if (Date.now() - cacheLoadedAt > 60000) await loadFlags()
  return flagCache[FEATURE_FLAGS[key].key] ?? false
}

// Sync check (uses cache, no DB hit)
export function isFeatureEnabledSync(key: FeatureFlagKey): boolean {
  return flagCache[FEATURE_FLAGS[key].key] ?? false
}

// Force refresh the cache (call after updating a flag)
export async function refreshFlagCache() {
  await loadFlags()
}

// Initialize flags on startup
export async function initFeatureFlags() {
  await loadFlags()
  logger.info("Feature flags loaded", { flags: Object.keys(flagCache).length })
}
