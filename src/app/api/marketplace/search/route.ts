import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/search?q=X — autocomplete search across labs, tests, cities
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20)

    if (q.length < 2) {
      // Return trending searches when no query
      return Response.json({
        suggestions: [],
        trending: ["CBC", "Thyroid Profile", "Full Body Checkup", "HbA1c", "Lipid Profile", "Vitamin D", "Blood Glucose", "Liver Function Test"],
        recent: [], // TODO: track recent searches per session
      })
    }

    // Search labs
    const labs = await db.marketplaceLab.findMany({
      where: {
        active: true,
        OR: [
          { displayName: { contains: q } },
          { city: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, displayName: true, slug: true, city: true, rating: true, nablCertified: true },
      take: limit,
    })

    // Search tests across all orgs that have marketplace labs
    const labOrgIds = labs.map((l) => l.id)
    // Also search tests in all marketplace labs' orgs
    const allLabs = await db.marketplaceLab.findMany({ where: { active: true }, select: { organizationId: true } })
    const orgIds = allLabs.map((l) => l.organizationId)

    const tests = await db.test.findMany({
      where: {
        organizationId: { in: orgIds },
        active: true,
        OR: [{ name: { contains: q } }, { code: { contains: q } }, { shortName: { contains: q } }],
      },
      select: { id: true, name: true, shortName: true, code: true, price: true, department: true, organizationId: true },
      take: limit,
    })

    // Map test prices to labs
    const labByOrg = await db.marketplaceLab.findMany({
      where: { organizationId: { in: tests.map((t) => t.organizationId) } },
      select: { id: true, displayName: true, slug: true, organizationId: true },
    })
    const orgToLab = Object.fromEntries(labByOrg.map((l) => [l.organizationId, l]))

    const suggestions = [
      ...labs.map((l) => ({ type: "lab", id: l.id, label: l.displayName, sublabel: l.city, slug: l.slug, rating: l.rating })),
      ...tests.map((t) => ({
        type: "test",
        id: t.id,
        label: t.name,
        sublabel: `${t.department || "Test"} · ₹${t.price}`,
        lab: orgToLab[t.organizationId]?.displayName,
        labSlug: orgToLab[t.organizationId]?.slug,
      })),
    ].slice(0, limit * 2)

    return Response.json({ suggestions, trending: [], recent: [] })
  } catch (e) {
    return errorResponse(e)
  }
}
