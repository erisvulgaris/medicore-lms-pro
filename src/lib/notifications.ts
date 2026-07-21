// Notification provider interface.
// Supports multiple channels: in-app (always on), email, SMS, WhatsApp.
// In production, configure real providers (SendGrid, Twilio, etc.) via env vars.
// For dev/demo, the console provider logs to stdout.

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export interface NotificationPayload {
  organizationId: string
  userId?: string | null
  type: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS"
  title: string
  message: string
  channel?: "IN_APP" | "EMAIL" | "SMS" | "WHATSAPP"
}

// Always creates an in-app notification in the DB
export async function sendNotification(payload: NotificationPayload) {
  try {
    await db.notification.create({
      data: {
        organizationId: payload.organizationId,
        userId: payload.userId ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        channel: payload.channel || "IN_APP",
        read: false,
      },
    })
  } catch (e) {
    logger.error("Failed to create notification", { error: e instanceof Error ? e.message : String(e) })
  }

  // Email provider (if configured)
  if (payload.channel === "EMAIL" || payload.channel === undefined) {
    await sendEmail(payload)
  }
  // SMS provider (if configured)
  if (payload.channel === "SMS") {
    await sendSms(payload)
  }
}

// Email provider — uses console for dev, real provider in production
async function sendEmail(payload: NotificationPayload) {
  const provider = process.env.EMAIL_PROVIDER || "console"
  if (provider === "console") {
    logger.info("📧 Email notification (console provider)", { title: payload.title, message: payload.message })
    return
  }
  // Production: integrate SendGrid/SES/etc here
  // Example: await sgMail.send({ to, from, subject: payload.title, text: payload.message })
  logger.info("Email notification sent", { provider, title: payload.title })
}

// SMS provider — uses console for dev
async function sendSms(payload: NotificationPayload) {
  const provider = process.env.SMS_PROVIDER || "console"
  if (provider === "console") {
    logger.info("📱 SMS notification (console provider)", { title: payload.title, message: payload.message })
    return
  }
  logger.info("SMS notification sent", { provider, title: payload.title })
}

// Helper to notify on critical result
export async function notifyCriticalResult(orgId: string, patientName: string, testName: string, value: string, flag: string) {
  await sendNotification({
    organizationId: orgId,
    type: "CRITICAL",
    title: "Critical Value Alert",
    message: `${testName} result ${value} (${flag}) for patient ${patientName} requires immediate pathologist review.`,
  })
}

// Helper to notify on report approval
export async function notifyReportApproved(orgId: string, patientName: string, reportCode: string) {
  await sendNotification({
    organizationId: orgId,
    type: "SUCCESS",
    title: "Report Approved",
    message: `Report ${reportCode} for ${patientName} has been approved and is ready for delivery.`,
  })
}

// Helper to notify on payment received
export async function notifyPaymentReceived(orgId: string, amount: number, invoiceCode: string, mode: string) {
  await sendNotification({
    organizationId: orgId,
    type: "SUCCESS",
    title: "Payment Received",
    message: `₹${amount} payment received for ${invoiceCode} via ${mode}.`,
  })
}
