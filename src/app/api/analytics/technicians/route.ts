import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requireUser, errorResponse } from "@/lib/session"

// Technician productivity analytics: results entered, samples collected,
// TAT performance, workload distribution by technician.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const orgId = user.organizationId
    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") || "30"
    const days = Math.min(Math.max(parseInt(range), 7), 365)
    const start = new Date(Date.now() - days * 86400000)

    // Get all lab technicians + pathologists in the org
    const staff = await db.user.findMany({
      where: { organizationId: orgId, role: { in: ["LAB_TECHNICIAN", "PATHOLOGIST", "PHLEBOTOMIST"] }, active: true },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { role: "asc" },
    })

    // Results entered by each technician in range
    const results = await db.result.findMany({
      where: { enteredAt: { gte: start }, enteredBy: { organizationId: orgId } },
      include: { enteredBy: { select: { id: true, name: true, role: true } }, orderTest: { include: { test: { select: { name: true, shortName: true, department: true } } } } },
      take: 2000,
    })

    // Samples collected by each phlebotomist
    const samples = await db.sample.findMany({
      where: { organizationId: orgId, collectedAt: { gte: start } },
      include: { collectedBy: { select: { id: true, name: true, role: true } } },
      take: 2000,
    })

    // Reports approved by each pathologist
    const reports = await db.report.findMany({
      where: { organizationId: orgId, approvedAt: { gte: start } },
      include: { approvedBy: { select: { id: true, name: true, role: true } } },
      take: 2000,
    })

    // Aggregate per technician
    const statsMap: Record<string, {
      id: string
      name: string
      role: string
      resultsEntered: number
      samplesCollected: number
      reportsApproved: number
      criticalFlags: number
      abnormalFlags: number
      departments: Record<string, number>
    }> = {}

    for (const s of staff) {
      statsMap[s.id] = {
        id: s.id, name: s.name, role: s.role,
        resultsEntered: 0, samplesCollected: 0, reportsApproved: 0,
        criticalFlags: 0, abnormalFlags: 0, departments: {},
      }
    }

    for (const r of results) {
      if (!r.enteredBy) continue
      const entry = statsMap[r.enteredBy.id]
      if (!entry) continue
      entry.resultsEntered++
      if (r.flag === "CRITICAL_LOW" || r.flag === "CRITICAL_HIGH") entry.criticalFlags++
      else if (r.flag === "LOW" || r.flag === "HIGH" || r.flag === "ABNORMAL") entry.abnormalFlags++
      const dept = r.orderTest?.test?.department || "Other"
      entry.departments[dept] = (entry.departments[dept] || 0) + 1
    }

    for (const s of samples) {
      if (!s.collectedBy) continue
      const entry = statsMap[s.collectedBy.id]
      if (!entry) continue
      entry.samplesCollected++
    }

    for (const r of reports) {
      if (!r.approvedBy) continue
      const entry = statsMap[r.approvedBy.id]
      if (!entry) continue
      entry.reportsApproved++
    }

    const technicians = Object.values(statsMap).filter((t) => t.resultsEntered > 0 || t.samplesCollected > 0 || t.reportsApproved > 0)

    // Overall totals
    const totals = {
      staff: technicians.length,
      resultsEntered: technicians.reduce((s, t) => s + t.resultsEntered, 0),
      samplesCollected: technicians.reduce((s, t) => s + t.samplesCollected, 0),
      reportsApproved: technicians.reduce((s, t) => s + t.reportsApproved, 0),
      criticalFlags: technicians.reduce((s, t) => s + t.criticalFlags, 0),
      abnormalFlags: technicians.reduce((s, t) => s + t.abnormalFlags, 0),
    }

    // Daily trend (results entered per day)
    const dailyMap: Record<string, number> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      dailyMap[d] = 0
    }
    for (const r of results) {
      const d = r.enteredAt.toISOString().slice(0, 10)
      if (d in dailyMap) dailyMap[d]++
    }
    const trend = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))

    // Department workload distribution
    const deptWorkload: Record<string, number> = {}
    for (const r of results) {
      const dept = r.orderTest?.test?.department || "Other"
      deptWorkload[dept] = (deptWorkload[dept] || 0) + 1
    }
    const departments = Object.entries(deptWorkload).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

    return Response.json({
      range: { days, start: start.toISOString() },
      technicians,
      totals,
      trend,
      departments,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

