import { z } from "zod"
import { validationError } from "@/lib/session"

// Validate request body against a Zod schema. Throws a VALIDATION_ERROR on failure.
export async function validateBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw validationError("Invalid JSON body")
  }
  const result = schema.safeParse(body)
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    throw validationError(msg)
  }
  return result.data
}

// ── Schemas ──
export const patientCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dob: z.string().optional().nullable(),
  age: z.number().int().min(0).max(150).optional().nullable(),
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  emergencyContact: z.string().max(50).optional().nullable(),
  medicalHistory: z.string().max(2000).optional().nullable(),
  allergies: z.string().max(1000).optional().nullable(),
  gstin: z.string().max(20).optional().nullable(),
  isCorporate: z.boolean().optional(),
  corporateName: z.string().max(200).optional().nullable(),
  insuranceProvider: z.string().max(200).optional().nullable(),
  insuranceId: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const orderCreateSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional().nullable(),
  testIds: z.array(z.string().min(1)).min(1, "At least one test is required"),
  priority: z.enum(["ROUTINE", "URGENT", "STAT"]).optional(),
  isHomeCollection: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional(),
})

export const resultCreateSchema = z.object({
  orderTestId: z.string().optional(),
  orderId: z.string().optional(),
  testCode: z.string().optional(),
  value: z.string().min(1, "Value is required").max(500),
  unit: z.string().max(50).optional().nullable(),
  referenceRange: z.string().max(200).optional().nullable(),
  remarks: z.string().max(1000).optional().nullable(),
})

export const paymentCreateSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().positive("Amount must be positive"),
  mode: z.enum(["CASH", "CARD", "UPI", "NETBANKING", "CHEQUE", "WALLET"]),
  reference: z.string().max(200).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
})

export const inventoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Code is required").max(50),
  category: z.enum(["REAGENT", "CONSUMABLE", "EQUIPMENT"]),
  unit: z.string().max(30),
  stockQty: z.number().min(0),
  reorderLevel: z.number().min(0).optional(),
  reorderQty: z.number().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
  expiryDate: z.string().optional().nullable(),
  batchNo: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const appointmentCreateSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().optional().nullable(),
  appointmentDate: z.string().min(1, "Date is required"),
  timeSlot: z.string().max(20).optional().nullable(),
  type: z.enum(["WALK_IN", "SCHEDULED", "HOME_COLLECTION", "CORPORATE", "ONLINE"]).optional(),
  notes: z.string().max(1000).optional().nullable(),
  homeAddress: z.string().max(500).optional().nullable(),
})

export const doctorCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  specialization: z.string().max(100).optional().nullable(),
  qualifications: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  clinicName: z.string().max(200).optional().nullable(),
  clinicAddress: z.string().max(500).optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional(),
  commissionEnabled: z.boolean().optional(),
})
