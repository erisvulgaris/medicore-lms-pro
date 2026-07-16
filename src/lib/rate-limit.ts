// Simple in-memory rate limiter for brute-force protection.
// For production with multiple instances, replace with Redis-backed limiter.

const store = new Map<string, { count: number; resetAt: number }>()

// Check if a request is allowed under the rate limit.
// Returns true if allowed, false if rate-limited.
export function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

// Get remaining attempts for a key (useful for login feedback)
export function getRemainingAttempts(key: string, maxRequests: number): number {
  const entry = store.get(key)
  if (!entry || entry.resetAt < Date.now()) return maxRequests
  return Math.max(0, maxRequests - entry.count)
}

// Clean up expired entries periodically (call on each check)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key)
    }
  }, 60000).unref?.()
}
