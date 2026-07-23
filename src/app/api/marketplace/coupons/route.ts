import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { requirePermission, errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const couponSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20).toUpperCase(),
  description: z.string().max(200).optional(),
  discountType: z.enum(["PERCENT", "FLAT"]),
  discountValue: z.number().positive("Discount must be positive"),
  maxDiscount: z.number().min(0).optional(),
  minOrder: z.number().min(0).optional(),
  validTo: z.string().optional(),
  usageLimit: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
})

// POST /api/marketplace/coupons — create coupon (admin)
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("settings.manage")
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    }
    const body = await req.json()
    const parsed = couponSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 })

    const existing = await db.coupon.findUnique({ where: { code: parsed.data.code } })
    if (existing) return Response.json({ error: "Coupon code already exists" }, { status: 409 })

    const coupon = await db.coupon.create({
      data: {
        code: parsed.data.code,
        description: parsed.data.description || null,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        maxDiscount: parsed.data.maxDiscount || 0,
        minOrder: parsed.data.minOrder || 0,
        validFrom: new Date(),
        validTo: parsed.data.validTo ? new Date(parsed.data.validTo) : null,
        usageLimit: parsed.data.usageLimit || 0,
        active: parsed.data.active ?? true,
      },
    })
    await logAudit({ organizationId: user.organizationId, userId: user.id, action: "CREATE_COUPON", entity: "Coupon", entityId: coupon.id, details: `Created coupon ${coupon.code}` })
    return Response.json({ coupon }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}

// GET /api/marketplace/coupons — list coupons (admin)
export async function GET(req: NextRequest) {
  try {
    await requirePermission("settings.manage")
    if (!(await isFeatureEnabled("MARKETPLACE"))) return Response.json({ error: "Marketplace is not enabled" }, { status: 403 })
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } })
    return Response.json({ coupons })
  } catch (e) {
    return errorResponse(e)
  }
}
