// Client-side fetch wrapper that injects the demo user header.
const USER_KEY = "lms_demo_user_id"

export function getDemoUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_KEY)
}

export function setDemoUserId(id: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(USER_KEY, id)
  window.dispatchEvent(new Event("lms-user-change"))
}

export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const userId = getDemoUserId()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  }
  if (userId) headers["x-user-id"] = userId
  const res = await fetch(path, { ...opts, headers })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      msg = j.error || msg
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  get: <T = unknown>(p: string) => apiFetch<T>(p),
  post: <T = unknown>(p: string, body?: unknown) => apiFetch<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(p: string, body?: unknown) => apiFetch<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(p: string, body?: unknown) => apiFetch<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
}
