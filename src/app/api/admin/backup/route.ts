import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { logAudit } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { promises as fs } from "fs"
import path from "path"

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./db/custom.db"
const BACKUP_DIR = path.dirname(DB_PATH)

// GET: list available backups + DB stats
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("settings.manage")
    const stats = await db.$transaction(async (tx) => {
      const tables = ["Organization", "Branch", "User", "Patient", "Doctor", "Test", "TestOrder", "Sample", "Result", "Report", "Invoice", "Payment", "InventoryItem", "Notification", "AuditLog", "Session"]
      const counts: Record<string, number> = {}
      for (const t of tables) {
        try {
          // @ts-expect-error dynamic model access
          counts[t] = await tx[t].count()
        } catch { counts[t] = 0 }
      }
      return counts
    })

    // List backup files
    let backups: { name: string; size: number; created: string }[] = []
    try {
      const files = await fs.readdir(BACKUP_DIR)
      backups = (await Promise.all(
        files
          .filter((f) => f.includes("backup") && f.endsWith(".db"))
          .map(async (f) => {
            const stat = await fs.stat(path.join(BACKUP_DIR, f))
            return { name: f, size: stat.size, created: stat.mtime.toISOString() }
          })
      )).sort((a, b) => b.created.localeCompare(a.created))
    } catch { /* dir doesn't exist yet */ }

    return Response.json({ stats, backups, dbPath: DB_PATH })
  } catch (e) {
    return errorResponse(e)
  }
}

// POST: create a backup (copy the SQLite file)
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("settings.manage")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupName = `backup-${timestamp}.db`
    const backupPath = path.join(BACKUP_DIR, backupName)

    try {
      await fs.copyFile(DB_PATH, backupPath)
      const stat = await fs.stat(backupPath)
      logger.info("Database backup created", { backupName, size: stat.size, userId: user.id })
      await logAudit({ organizationId: user.organizationId, userId: user.id, action: "DB_BACKUP", entity: "System", entityId: backupName, details: `Backup created (${(stat.size / 1024).toFixed(1)} KB)` })
      return Response.json({ ok: true, backup: { name: backupName, size: stat.size, created: new Date().toISOString() } }, { status: 201 })
    } catch (e) {
      logger.error("Backup failed", { error: e instanceof Error ? e.message : String(e) })
      return Response.json({ error: "Backup failed: " + (e instanceof Error ? e.message : "unknown") }, { status: 500 })
    }
  } catch (e) {
    return errorResponse(e)
  }
}
