import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// Wishlist stored in localStorage on the client side (array of lab slugs).
// This API endpoint is for syncing/validating wishlist items.

// GET /api/marketplace/wishlist?slugs=slug1,slug2 — validate wishlist labs
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const slugs = searchParams.get("slugs") || ""
    if (!slugs) return Response.json({ labs: [] })

    const slugList = slugs.split(",").filter(Boolean)
    const labs = await db.marketplaceLab.findMany({
      where: { slug: { in: slugList }, active: true },
      select: {
        id: true, slug: true, displayName: true, city: true, rating: true,
        nablCertified: true, homeCollection: true, homeCollectionFee: true,
        open24x7: true, openTime: true, closeTime: true, verified: true,
        featured: true, address: true, reviews: { select: { rating: true }, take: 100 },
      },
    })

    const labsWithRatings = labs.map((l) => {
      const reviews = l.reviews || []
      const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : l.rating
      return { ...l, rating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length, reviews: undefined }
    })

    return Response.json({ labs: labsWithRatings })
  } catch (e) {
    return errorResponse(e)
  }
}
