import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"
import { isFeatureEnabled } from "@/lib/feature-flags"

// GET /api/marketplace/status — public endpoint to check if marketplace is enabled
export async function GET() {
  try {
    const enabled = await isFeatureEnabled("MARKETPLACE")
    return Response.json({ enabled })
  } catch (e) {
    return errorResponse(e)
  }
}
