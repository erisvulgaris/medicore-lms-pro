import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/labs/[slug] — public lab detail with tests + reviews
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { slug } = await params
    const lab = await db.marketplaceLab.findUnique({
      where: { slug },
      include: {
        organization: { select: { name: true, code: true, accentColor: true } },
        reviews: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })
    if (!lab || !lab.active) return errorResponse(new Error("NOT_FOUND"))

    // Get the org's tests as the "services catalog"
    const tests = await db.test.findMany({
      where: { organizationId: lab.organizationId, active: true },
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
    })
    const profiles = await db.testProfile.findMany({
      where: { organizationId: lab.organizationId, active: true },
      include: { items: { include: { test: { select: { name: true, shortName: true } } } } },
    })
    const packages = await db.testPackage.findMany({
      where: { organizationId: lab.organizationId, active: true },
      include: { items: { include: { test: { select: { name: true, shortName: true } } } } },
    })

    // Compute live rating
    const reviews = lab.reviews || []
    const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : lab.rating

    return Response.json({
      lab: { ...lab, rating: Math.round(rating * 10) / 10, reviewCount: reviews.length },
      tests,
      profiles,
      packages,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
