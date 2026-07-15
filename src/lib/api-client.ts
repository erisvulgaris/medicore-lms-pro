// Client-side fetch wrapper with Bearer token authentication.
const TOKEN_KEY = "lms_auth_token"

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
  window.dispatchEvent(new Event("lms-auth-change"))
}

export function clearAuthToken() {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  window.dispatchEvent(new Event("lms-auth-change"))
}

export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(path, { ...opts, headers })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      msg = j.error || msg
    } catch {}
    const err = new Error(msg)
    ;(err as any).status = res.status
    throw err
  }
  return res.json()
}

export const api = {
  get: <T = unknown>(p: string) => apiFetch<T>(p),
  post: <T = unknown>(p: string, body?: unknown) => apiFetch<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(p: string, body?: unknown) => apiFetch<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(p: string, body?: unknown) => apiFetch<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
}
