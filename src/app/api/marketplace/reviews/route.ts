import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { z } from "zod"

// GET /api/marketplace/reviews?labId=X — list reviews for a lab
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const labId = searchParams.get("labId")
    if (!labId) return Response.json({ reviews: [] })

    const reviews = await db.labReview.findMany({
      where: { labId, reported: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return Response.json({ reviews })
  } catch (e) {
    return errorResponse(e)
  }
}

const reviewSchema = z.object({
  labId: z.string().min(1),
  patientName: z.string().min(1, "Name is required"),
  patientPhone: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
})

// POST /api/marketplace/reviews — submit a review
export async function POST(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 })
    }
    const data = parsed.data

    const lab = await db.marketplaceLab.findUnique({ where: { id: data.labId } })
    if (!lab) return Response.json({ error: "Lab not found" }, { status: 404 })

    const review = await db.labReview.create({
      data: {
        labId: data.labId,
        patientName: data.patientName,
        patientPhone: data.patientPhone || null,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment || null,
      },
    })

    // Update lab's aggregate rating
    const allReviews = await db.labReview.findMany({ where: { labId: data.labId, reported: false }, select: { rating: true } })
    const avgRating = allReviews.length ? allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length : 0
    await db.marketplaceLab.update({ where: { id: data.labId }, data: { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length } })

    return Response.json({ review }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
