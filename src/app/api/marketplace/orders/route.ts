import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { logAudit } from "@/lib/audit"
import { z } from "zod"

const orderSchema = z.object({
  sessionId: z.string().min(1),
  patientName: z.string().min(1, "Patient name is required"),
  patientPhone: z.string().min(7, "Valid phone is required"),
  patientEmail: z.string().email().optional().or(z.literal("")),
  patientAge: z.number().int().min(0).max(150).optional(),
  patientGender: z.enum(["Male", "Female", "Other"]).optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  preferredDate: z.string().optional(),
  timeSlot: z.string().optional(),
  homeCollection: z.boolean().optional(),
  couponCode: z.string().optional(),
  paymentMode: z.enum(["COD", "ONLINE"]).optional(),
})

// POST /api/marketplace/orders — place a marketplace order
export async function POST(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    if (await isFeatureEnabled("MAINTENANCE_MODE")) {
      return Response.json({ error: "Marketplace is under maintenance. Please try again later." }, { status: 503 })
    }

    const body = await req.json()
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, { status: 400 })
    }
    const data = parsed.data

    // Get cart
    const cart = await db.cart.findUnique({
      where: { sessionId: data.sessionId },
      include: { items: true },
    })
    if (!cart || !cart.items.length) {
      return Response.json({ error: "Your cart is empty" }, { status: 400 })
    }

    const lab = await db.marketplaceLab.findUnique({ where: { id: cart.labId! } })
    if (!lab || !lab.active) {
      return Response.json({ error: "Lab not available" }, { status: 400 })
    }

    // Check home collection if requested
    if (data.homeCollection && !lab.homeCollection) {
      return Response.json({ error: "This lab does not offer home collection" }, { status: 400 })
    }

    // Calculate pricing
    const subtotal = cart.items.reduce((s, i) => s + i.price, 0)
    const homeCollectionFee = data.homeCollection ? lab.homeCollectionFee : 0
    let discount = 0
    let couponCode = data.couponCode

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await db.coupon.findFirst({
        where: { code: couponCode, active: true, validFrom: { lte: new Date() } },
      })
      if (coupon && (!coupon.validTo || coupon.validTo > new Date()) && (coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit)) {
        if (subtotal >= coupon.minOrder) {
          if (coupon.discountType === "PERCENT") {
            discount = Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount || Infinity)
          } else {
            discount = coupon.discountValue
          }
          await db.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
        }
      }
    }

    const platformFee = Math.round(subtotal * 0.05) // 5% platform fee
    const taxAmount = 0 // GST handled per-test in LMS; marketplace tracks platform fee
    const totalAmount = subtotal + homeCollectionFee - discount + platformFee + taxAmount

    const orderCount = await db.marketplaceOrder.count()
    const orderCode = `MP-${10001 + orderCount}`
    const pickupOtp = data.homeCollection ? String(Math.floor(1000 + Math.random() * 9000)) : null

    const testsJson = JSON.stringify(cart.items.map((i) => ({ testName: i.testName, testCode: i.testCode, price: i.price })))

    const order = await db.marketplaceOrder.create({
      data: {
        orderCode,
        labId: lab.id,
        sessionId: data.sessionId,
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientEmail: data.patientEmail || null,
        patientAge: data.patientAge ?? null,
        patientGender: data.patientGender ?? null,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        timeSlot: data.timeSlot || null,
        homeCollection: !!data.homeCollection,
        homeCollectionFee,
        testsJson,
        subtotal,
        discount,
        couponCode: couponCode || null,
        taxAmount,
        platformFee,
        totalAmount,
        paymentMode: data.paymentMode || "COD",
        paymentStatus: data.paymentMode === "ONLINE" ? "PENDING" : "PENDING",
        status: "PLACED",
        pickupOtp,
      },
    })

    // Clear cart
    await db.cart.delete({ where: { id: cart.id } })

    await logAudit({
      organizationId: lab.organizationId,
      action: "MARKETPLACE_ORDER",
      entity: "MarketplaceOrder",
      entityId: order.id,
      details: `${orderCode} for ${data.patientName} (${cart.items.length} tests, ₹${totalAmount})`,
    })

    return Response.json({ order, message: "Order placed successfully!" }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}

// GET /api/marketplace/orders — list orders by session
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const sessionId = req.headers.get("x-session-id") || new URL(req.url).searchParams.get("sessionId") || ""
    if (!sessionId) return Response.json({ orders: [] })

    const orders = await db.marketplaceOrder.findMany({
      where: { sessionId },
      include: { lab: { select: { displayName: true, slug: true, address: true, city: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return Response.json({ orders })
  } catch (e) {
    return errorResponse(e)
  }
}
