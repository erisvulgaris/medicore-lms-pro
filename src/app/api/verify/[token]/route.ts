import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { errorResponse } from "@/lib/session"

// Public report verification — no auth required
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const report = await db.report.findUnique({
      where: { verificationToken: token },
      include: {
        order: {
          include: {
            patient: { select: { firstName: true, lastName: true, patientCode: true, gender: true, age: true } },
            doctor: { select: { name: true, specialization: true } },
            orderTests: { include: { test: { select: { name: true, shortName: true, unit: true } }, results: true } },
          },
        },
        approvedBy: { select: { name: true } },
        organization: { select: { name: true, city: true, phone: true, address: true } },
      },
    })
    if (!report) return errorResponse(new Error("NOT_FOUND"))
    return Response.json({ report })
  } catch (e) {
    return errorResponse(e)
  }
}
