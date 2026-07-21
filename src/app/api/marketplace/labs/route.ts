import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/labs — public list of marketplace labs with real ratings + filters
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
    const featuredOnly = searchParams.get("featured") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

    const where: any = { active: true }
    if (q) {
      where.OR = [
        { displayName: { contains: q } },
        { city: { contains: q } },
        { description: { contains: q } },
        { address: { contains: q } },
      ]
    }
    if (city) where.city = { contains: city }
    if (nablOnly) where.nablCertified = true
    if (homeCollectionOnly) where.homeCollection = true
    if (featuredOnly) where.featured = true

    let labs = await db.marketplaceLab.findMany({
      where,
      include: {
        reviews: { select: { rating: true }, take: 500 },
        _count: { select: { marketplaceOrders: true } },
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

    // Compute live rating from reviews + openNow filter
    const now = new Date()
    const currentHour = now.getHours() * 100 + now.getMinutes()
    labs = labs.filter((l) => {
      if (!openNow) return true
      if (l.open24x7) return true
      if (!l.openTime || !l.closeTime) return false
      const open = parseInt(l.openTime.replace(":", ""))
      const close = parseInt(l.closeTime.replace(":", ""))
      return currentHour >= open && currentHour <= close
    })

    labs = labs.map((l) => {
      const reviews = l.reviews || []
      const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
      return {
        id: l.id,
        slug: l.slug,
        displayName: l.displayName,
        description: l.description,
        address: l.address,
        city: l.city,
        state: l.state,
        latitude: l.latitude,
        longitude: l.longitude,
        phone: l.phone,
        nablCertified: l.nablCertified,
        open24x7: l.open24x7,
        openTime: l.openTime,
        closeTime: l.closeTime,
        homeCollection: l.homeCollection,
        homeCollectionFee: l.homeCollectionFee,
        homeCollectionRadius: l.homeCollectionRadius,
        parking: l.parking,
        wheelchairAccess: l.wheelchairAccess,
        emergencyService: l.emergencyService,
        verified: l.verified,
        featured: l.featured,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
        orderCount: (l as any)._count?.marketplaceOrders || 0,
        distance: (l as any).distance,
      }
    })

    // Sort
    if (sort === "rating") labs.sort((a, b) => b.rating - a.rating)
    else if (sort === "distance") labs.sort((a, b) => (a.distance || 999) - (b.distance || 999))
    else if (sort === "name") labs.sort((a, b) => a.displayName.localeCompare(b.displayName))
    else if (sort === "orders") labs.sort((a, b) => b.orderCount - a.orderCount)

    // Get unique cities for filter
    const allLabs = await db.marketplaceLab.findMany({ where: { active: true }, select: { city: true }, distinct: ["city"] })
    const cities = allLabs.map((l) => l.city).sort()

    return Response.json({ labs, total: labs.length, cities })
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
