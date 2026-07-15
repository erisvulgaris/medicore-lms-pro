// Structured logging utility for production observability.
// In production, integrate with a log aggregator (e.g. Pino → Datadog/CloudWatch).
// For now, writes structured JSON to stdout/stderr.

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout
  stream.write(JSON.stringify(entry) + "\n")
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
}

// API request logger — call at the start of each route handler
export function logRequest(method: string, path: string, userId?: string, orgId?: string) {
  logger.info("API request", { method, path, userId, orgId })
}

// Error tracker — call in catch blocks before returning errorResponse
export function logError(error: unknown, context?: { method?: string; path?: string; userId?: string }) {
  const msg = error instanceof Error ? error.message : String(error)
  logger.error("API error", {
    message: msg,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  })
}
