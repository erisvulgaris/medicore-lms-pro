import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/search?q=X — autocomplete search across labs, tests, profiles, packages
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 30)

    const trending = ["CBC", "Thyroid Profile", "Full Body Checkup", "HbA1c", "Lipid Profile", "Vitamin D", "Blood Glucose", "Liver Function Test", "Diabetes Package", "Women's Health"]

    if (q.length < 2) {
      return Response.json({ suggestions: [], trending, popular: [] })
    }

    // Search labs
    const labs = await db.marketplaceLab.findMany({
      where: {
        active: true,
        OR: [
          { displayName: { contains: q } },
          { city: { contains: q } },
          { description: { contains: q } },
          { address: { contains: q } },
        ],
      },
      select: { id: true, displayName: true, slug: true, city: true, rating: true, nablCertified: true, reviews: { select: { rating: true }, take: 100 } },
      take: limit,
    })

    // Get all marketplace lab org IDs
    const allLabs = await db.marketplaceLab.findMany({ where: { active: true }, select: { id: true, organizationId: true, displayName: true, slug: true, city: true } })
    const orgToLab = Object.fromEntries(allLabs.map((l) => [l.organizationId, l]))

    // Search tests
    const tests = await db.test.findMany({
      where: {
        organizationId: { in: Object.keys(orgToLab) },
        active: true,
        OR: [{ name: { contains: q } }, { code: { contains: q } }, { shortName: { contains: q } }, { department: { contains: q } }],
      },
      select: { id: true, name: true, shortName: true, code: true, price: true, department: true, organizationId: true },
      take: limit,
    })

    // Search profiles
    const profiles = await db.testProfile.findMany({
      where: {
        organizationId: { in: Object.keys(orgToLab) },
        active: true,
        OR: [{ name: { contains: q } }, { code: { contains: q } }],
      },
      select: { id: true, name: true, code: true, price: true, organizationId: true },
      take: limit,
    })

    // Search packages
    const packages = await db.testPackage.findMany({
      where: {
        organizationId: { in: Object.keys(orgToLab) },
        active: true,
        OR: [{ name: { contains: q } }, { code: { contains: q } }],
      },
      select: { id: true, name: true, code: true, price: true, mrp: true, organizationId: true },
      take: limit,
    })

    // Build suggestions
    const suggestions = [
      ...labs.map((l) => {
        const reviews = l.reviews || []
        const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : l.rating
        return { type: "lab", id: l.id, label: l.displayName, sublabel: l.city, slug: l.slug, rating: Math.round(rating * 10) / 10, nabl: l.nablCertified }
      }),
      ...tests.map((t) => ({
        type: "test", id: t.id, label: t.name, sublabel: `${t.department || "Test"} · ₹${t.price}`,
        lab: orgToLab[t.organizationId]?.displayName, labSlug: orgToLab[t.organizationId]?.slug, price: t.price,
      })),
      ...profiles.map((p) => ({
        type: "profile", id: p.id, label: p.name, sublabel: `Profile · ₹${p.price}`,
        lab: orgToLab[p.organizationId]?.displayName, labSlug: orgToLab[p.organizationId]?.slug, price: p.price,
      })),
      ...packages.map((p) => ({
        type: "package", id: p.id, label: p.name, sublabel: `Package · ₹${p.price}${p.mrp > p.price ? ` (₹${p.mrp} off)` : ""}`,
        lab: orgToLab[p.organizationId]?.displayName, labSlug: orgToLab[p.organizationId]?.slug, price: p.price,
      })),
    ].slice(0, limit * 2)

    return Response.json({ suggestions, trending, total: suggestions.length })
  } catch (e) {
    return errorResponse(e)
  }
}
