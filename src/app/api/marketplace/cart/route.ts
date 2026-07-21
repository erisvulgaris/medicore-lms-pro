import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/cart — get cart by session ID (from header or query)
export async function GET(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const sessionId = req.headers.get("x-session-id") || new URL(req.url).searchParams.get("sessionId") || ""
    if (!sessionId) return Response.json({ cart: null })

    const cart = await db.cart.findUnique({
      where: { sessionId },
      include: { items: { include: { lab: { select: { displayName: true, slug: true, city: true } } } } },
    })
    return Response.json({ cart })
  } catch (e) {
    return errorResponse(e)
  }
}

// POST /api/marketplace/cart — add item to cart
export async function POST(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const body = await req.json()
    const { sessionId, labId, testId, testName, testCode, price, homeCollection } = body
    if (!sessionId || !labId || !testName || price == null) {
      return Response.json({ error: "sessionId, labId, testName, and price are required" }, { status: 400 })
    }

    // Find or create cart
    let cart = await db.cart.findUnique({ where: { sessionId }, include: { items: true } })
    if (!cart) {
      cart = await db.cart.create({ data: { sessionId, labId }, include: { items: true } })
    }

    // Enforce single-lab cart (can only add tests from one lab at a time)
    if (cart.labId && cart.labId !== labId) {
      return Response.json({ error: "Your cart already has tests from a different lab. Please clear your cart first.", currentLab: cart.labId }, { status: 409 })
    }

    // Set labId if not set
    if (!cart.labId) {
      cart = await db.cart.update({ where: { id: cart.id }, data: { labId }, include: { items: true } })
    }

    // Check if item already in cart
    const existing = cart.items.find((i) => i.testId === testId && i.testName === testName)
    if (existing) {
      return Response.json({ error: "This test is already in your cart" }, { status: 409 })
    }

    const item = await db.cartItem.create({
      data: { cartId: cart.id, labId, testId, testName, testCode, price: Number(price), homeCollection: !!homeCollection },
      include: { lab: { select: { displayName: true, slug: true } } },
    })

    return Response.json({ item, cartId: cart.id }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}

// DELETE /api/marketplace/cart — remove item or clear cart
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isFeatureEnabled("MARKETPLACE"))) {
      return Response.json({ error: "Marketplace is not available" }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const sessionId = req.headers.get("x-session-id") || searchParams.get("sessionId") || ""
    const itemId = searchParams.get("itemId")

    if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 })

    if (itemId) {
      await db.cartItem.delete({ where: { id: itemId } })
    } else {
      await db.cart.delete({ where: { sessionId } }).catch(() => {})
    }
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
