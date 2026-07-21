import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/labs — public list of marketplace labs
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const city = searchParams.get("city")
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const radius = parseFloat(searchParams.get("radius") || "50")
    const sort = searchParams.get("sort") || "rating"
    const nablOnly = searchParams.get("nabl") === "true"
    const homeCollectionOnly = searchParams.get("homeCollection") === "true"
    const openNow = searchParams.get("openNow") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

    const where: any = { active: true }
    if (q) where.OR = [{ displayName: { contains: q } }, { city: { contains: q } }, { description: { contains: q } }]
    if (city) where.city = { contains: city }
    if (nablOnly) where.nablCertified = true
    if (homeCollectionOnly) where.homeCollection = true

    let labs = await db.marketplaceLab.findMany({
      where,
      include: {
        organization: { select: { name: true, code: true } },
        reviews: { select: { rating: true }, take: 100 },
      },
      take: limit,
    })

    // Compute distance if lat/lng provided
    if (lat && lng) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      labs = labs
        .filter((l) => l.latitude && l.longitude)
        .map((l) => ({ ...l, distance: haversine(userLat, userLng, l.latitude!, l.longitude!) }))
        .filter((l) => (l as any).distance <= radius)
    }

    // Compute live rating from reviews
    labs = labs.map((l) => {
      const reviews = l.reviews || []
      const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : l.rating
      return { ...l, rating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length, reviews: undefined }
    })

    // Sort
    if (sort === "rating") labs.sort((a, b) => (b as any).rating - (a as any).rating)
    else if (sort === "distance" && lat && lng) labs.sort((a, b) => (a as any).distance - (b as any).distance)
    else if (sort === "name") labs.sort((a, b) => a.displayName.localeCompare(b.displayName))

    return Response.json({ labs, total: labs.length })
  } catch (e) {
    return errorResponse(e)
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
