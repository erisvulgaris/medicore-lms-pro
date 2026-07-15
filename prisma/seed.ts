import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import fs from "fs"
import { randomToken } from "../src/lib/format"

const db = new PrismaClient()

// Reference ranges as JSON strings
const refRanges = (ranges: object[]) => JSON.stringify(ranges)

const ADULT_M = (low: number, high: number, cl?: number, ch?: number) =>
  refRanges([{ gender: "All", low, high, criticalLow: cl, criticalHigh: ch }])

async function main() {
  console.log("🌱 Seeding Pathology LMS...")

  // ── Organization ──
  const org = await db.organization.upsert({
    where: { code: "MEDLAB" },
    update: {},
    create: {
      name: "MediCore Diagnostics",
      legalName: "MediCore Diagnostics Pvt. Ltd.",
      code: "MEDLAB",
      email: "info@medicore.example",
      phone: "+91 98765 43210",
      address: "204, Health Avenue, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      gstin: "29ABCDE1234F1Z5",
      accentColor: "emerald",
    },
  })

  const branch1 = await db.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "HQ" } },
    update: {},
    create: { organizationId: org.id, name: "Head Office — MG Road", code: "HQ", city: "Bengaluru", phone: "+91 80 4000 1000", isHeadOffice: true },
  })
  const branch2 = await db.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "INDIRA" } },
    update: {},
    create: { organizationId: org.id, name: "Indiranagar Branch", code: "INDIRA", city: "Bengaluru", phone: "+91 80 4000 2000" },
  })

  // ── Users (all roles) with real bcrypt-hashed passwords ──
  // Generate a strong per-role password and hash it with bcrypt (12 rounds).
  const generatedPasswords: { role: string; email: string; password: string }[] = []
  function genPassword(role: string) {
    // Deterministic but secure-ish demo password: role + random hex suffix
    const suffix = crypto.randomBytes(4).toString("hex")
    return `${role.slice(0, 4).toLowerCase()}@${suffix}`
  }
  const users = [
    { name: "Arjun Mehta", email: "owner@medicore.example", role: "ORG_OWNER", branchId: null },
    { name: "Priya Nair", email: "admin@medicore.example", role: "BRANCH_ADMIN", branchId: branch1.id },
    { name: "Sneha Reddy", email: "reception@medicore.example", role: "RECEPTIONIST", branchId: branch1.id },
    { name: "Rahul Kumar", email: "lab@medicore.example", role: "LAB_TECHNICIAN", branchId: branch1.id },
    { name: "Dr. Vikram Singh", email: "path@medicore.example", role: "PATHOLOGIST", branchId: branch1.id },
    { name: "Dr. Anjali Rao", email: "doctor@medicore.example", role: "DOCTOR", branchId: null },
    { name: "Manoj Pillai", email: "phleb@medicore.example", role: "PHLEBOTOMIST", branchId: branch1.id },
    { name: "Deepa Iyer", email: "cashier@medicore.example", role: "CASHIER", branchId: branch1.id },
    { name: "Karthik Menon", email: "accounts@medicore.example", role: "ACCOUNTANT", branchId: branch1.id },
  ]
  const userMap: Record<string, string> = {}
  const credentialsFile: string[] = []
  credentialsFile.push("# MediCore LMS — Generated Credentials")
  credentialsFile.push("# These are real bcrypt-hashed accounts. Use these to log in.")
  credentialsFile.push("# Format: email | password | role")
  credentialsFile.push("")
  for (const u of users) {
    const plainPassword = genPassword(u.role)
    const passwordHash = bcrypt.hashSync(plainPassword, 12)
    const created = await db.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: { passwordHash }, // update hash on re-seed so password stays valid
      create: { ...u, organizationId: org.id, passwordHash },
    })
    userMap[u.role] = created.id
    generatedPasswords.push({ role: u.role, email: u.email, password: plainPassword })
    credentialsFile.push(`${u.email} | ${plainPassword} | ${u.role}`)
    console.log(`  ${u.role.padEnd(16)} ${u.email.padEnd(32)} password: ${plainPassword}`)
  }
  // Write credentials to a file for the operator
  fs.writeFileSync("/home/z/my-project/CREDENTIALS.md", credentialsFile.join("\n"))
  console.log("\n📋 Credentials written to CREDENTIALS.md\n")

  // ── Test categories ──
  const categories = ["Hematology", "Biochemistry", "Microbiology", "Serology", "Clinical Pathology", "Thyroid", "Diabetes"]
  const catMap: Record<string, string> = {}
  for (const c of categories) {
    const cat = await db.testCategory.create({ data: { organizationId: org.id, name: c } })
    catMap[c] = cat.id
  }

  // ── Tests ──
  const tests = [
    { name: "Complete Blood Count", code: "CBC", shortName: "CBC", cat: "Hematology", sample: "Whole Blood", tube: "EDTA", unit: "", price: 350, dept: "Hematology", ranges: ADULT_M(0, 0), tat: 6 },
    { name: "Hemoglobin", code: "HB", shortName: "Hb", cat: "Hematology", sample: "Whole Blood", tube: "EDTA", unit: "g/dL", price: 120, dept: "Hematology", ranges: refRanges([{ gender: "Male", low: 13.5, high: 17.5, criticalLow: 7, criticalHigh: 20 }, { gender: "Female", low: 12.0, high: 15.5, criticalLow: 7, criticalHigh: 20 }]), tat: 4 },
    { name: "Total WBC Count", code: "WBC", shortName: "TLC", cat: "Hematology", sample: "Whole Blood", tube: "EDTA", unit: "10^3/µL", price: 150, dept: "Hematology", ranges: refRanges([{ gender: "All", low: 4.0, high: 11.0, criticalLow: 2.0, criticalHigh: 30 }]), tat: 4 },
    { name: "Platelet Count", code: "PLT", shortName: "PLT", cat: "Hematology", sample: "Whole Blood", tube: "EDTA", unit: "10^3/µL", price: 150, dept: "Hematology", ranges: refRanges([{ gender: "All", low: 150, high: 450, criticalLow: 50, criticalHigh: 1000 }]), tat: 4 },
    { name: "Fasting Blood Glucose", code: "FBG", shortName: "FBS", cat: "Diabetes", sample: "Plasma", tube: "Fluoride", unit: "mg/dL", price: 130, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 70, high: 100, criticalLow: 50, criticalHigh: 400 }]), tat: 4 },
    { name: "HbA1c", code: "HBA1C", shortName: "HbA1c", cat: "Diabetes", sample: "Whole Blood", tube: "EDTA", unit: "%", price: 450, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 4.0, high: 5.6, criticalLow: 0, criticalHigh: 14 }]), tat: 8 },
    { name: "Total Cholesterol", code: "TCHOL", shortName: "TC", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 200, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 100, high: 200, criticalLow: 50, criticalHigh: 400 }]), tat: 6 },
    { name: "Triglycerides", code: "TG", shortName: "TG", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 200, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 50, high: 150, criticalLow: 0, criticalHigh: 500 }]), tat: 6 },
    { name: "HDL Cholesterol", code: "HDL", shortName: "HDL", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 250, dept: "Biochemistry", ranges: refRanges([{ gender: "Male", low: 40, high: 60 }, { gender: "Female", low: 50, high: 60 }]), tat: 6 },
    { name: "LDL Cholesterol", code: "LDL", shortName: "LDL", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 250, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 0, high: 100 }]), tat: 6 },
    { name: "TSH", code: "TSH", shortName: "TSH", cat: "Thyroid", sample: "Serum", tube: "SST", unit: "µIU/mL", price: 350, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 0.4, high: 4.5, criticalLow: 0, criticalHigh: 100 }]), tat: 8 },
    { name: "T3 Total", code: "T3", shortName: "T3", cat: "Thyroid", sample: "Serum", tube: "SST", unit: "ng/dL", price: 300, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 80, high: 200 }]), tat: 8 },
    { name: "T4 Total", code: "T4", shortName: "T4", cat: "Thyroid", sample: "Serum", tube: "SST", unit: "µg/dL", price: 300, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 5.0, high: 12.0 }]), tat: 8 },
    { name: "Urea", code: "UREA", shortName: "Urea", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 150, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 15, high: 40, criticalLow: 5, criticalHigh: 200 }]), tat: 4 },
    { name: "Creatinine", code: "CREAT", shortName: "Creat", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 150, dept: "Biochemistry", ranges: refRanges([{ gender: "Male", low: 0.7, high: 1.3, criticalLow: 0.2, criticalHigh: 5 }, { gender: "Female", low: 0.6, high: 1.1, criticalLow: 0.2, criticalHigh: 5 }]), tat: 4 },
    { name: "Total Bilirubin", code: "BILIT", shortName: "T.Bili", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "mg/dL", price: 150, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 0.2, high: 1.2, criticalLow: 0, criticalHigh: 20 }]), tat: 4 },
    { name: "SGPT (ALT)", code: "SGPT", shortName: "ALT", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "U/L", price: 180, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 10, high: 40, criticalLow: 0, criticalHigh: 500 }]), tat: 4 },
    { name: "SGOT (AST)", code: "SGOT", shortName: "AST", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "U/L", price: 180, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 10, high: 40, criticalLow: 0, criticalHigh: 500 }]), tat: 4 },
    { name: "Urine Routine", code: "URINE", shortName: "Urine R", cat: "Clinical Pathology", sample: "Urine", tube: "Sterile Container", unit: "", price: 150, dept: "Clinical Pathology", ranges: ADULT_M(0, 0), tat: 4 },
    { name: "ESR", code: "ESR", shortName: "ESR", cat: "Hematology", sample: "Whole Blood", tube: "Citrate", unit: "mm/hr", price: 150, dept: "Hematology", ranges: refRanges([{ gender: "All", low: 0, high: 20 }]), tat: 4 },
    { name: "Vitamin D", code: "VITD", shortName: "Vit D", cat: "Biochemistry", sample: "Serum", tube: "SST", unit: "ng/mL", price: 800, dept: "Biochemistry", ranges: refRanges([{ gender: "All", low: 30, high: 100 }]), tat: 12 },
  ]
  const testMap: Record<string, string> = {}
  for (const t of tests) {
    const created = await db.test.create({
      data: {
        organizationId: org.id,
        categoryId: catMap[t.cat],
        name: t.name,
        code: t.code,
        shortName: t.shortName,
        sampleType: t.sample,
        tubeType: t.tube,
        unit: t.unit,
        department: t.dept,
        referenceRanges: t.ranges,
        tatHours: t.tat,
        price: t.price,
        cost: Math.round(t.price * 0.4),
        gstRate: 0,
        active: true,
      },
    })
    testMap[t.code] = created.id
  }

  // ── Profiles ──
  const lipidProfile = await db.testProfile.create({ data: { organizationId: org.id, name: "Lipid Profile", code: "LIPID", price: 700, description: "Total cholesterol, TG, HDL, LDL" } })
  for (const c of ["TCHOL", "TG", "HDL", "LDL"]) await db.testProfileItem.create({ data: { profileId: lipidProfile.id, testId: testMap[c] } })

  const thyroidProfile = await db.testProfile.create({ data: { organizationId: org.id, name: "Thyroid Profile (T3 T4 TSH)", code: "TFT", price: 800, description: "T3, T4, TSH" } })
  for (const c of ["TSH", "T3", "T4"]) await db.testProfileItem.create({ data: { profileId: thyroidProfile.id, testId: testMap[c] } })

  const lft = await db.testProfile.create({ data: { organizationId: org.id, name: "Liver Function Test", code: "LFT", price: 650, description: "Bilirubin, SGPT, SGOT" } })
  for (const c of ["BILIT", "SGPT", "SGOT"]) await db.testProfileItem.create({ data: { profileId: lft.id, testId: testMap[c] } })

  const kft = await db.testProfile.create({ data: { organizationId: org.id, name: "Kidney Function Test", code: "KFT", price: 500, description: "Urea, Creatinine" } })
  for (const c of ["UREA", "CREAT"]) await db.testProfileItem.create({ data: { profileId: kft.id, testId: testMap[c] } })

  // ── Packages ──
  const fullBody = await db.testPackage.create({ data: { organizationId: org.id, name: "Full Body Health Checkup", code: "FBHC", price: 2499, mrp: 3500, description: "Comprehensive 35+ parameter health check" } })
  for (const c of ["CBC", "FBG", "HBA1C", "LIPID", "TFT", "LFT", "KFT", "URINE", "VITD"]) {
    const testId = testMap[c]
    if (testId) await db.testPackageItem.create({ data: { packageId: fullBody.id, testId } })
  }

  // ── Doctors ──
  const doctors = [
    { name: "Dr. Anjali Rao", specialization: "General Physician", clinic: "Rao Clinic", commissionRate: 0 },
    { name: "Dr. Sanjay Gupta", specialization: "Cardiologist", clinic: "Heart Care Centre", commissionRate: 10 },
    { name: "Dr. Meera Krishnan", specialization: "Endocrinologist", clinic: "Krishnan Diabetes Centre", commissionRate: 0 },
    { name: "Dr. Ramesh Patil", specialization: "Orthopedic", clinic: "Patil Ortho Clinic", commissionRate: 5 },
    { name: "Dr. Fatima Sheikh", specialization: "Gynecologist", clinic: "Sheikh Women's Clinic", commissionRate: 0 },
  ]
  const docMap: Record<string, string> = {}
  for (const d of doctors) {
    const doc = await db.doctor.create({
      data: {
        organizationId: org.id,
        name: d.name,
        specialization: d.specialization,
        clinicName: d.clinic,
        phone: "+91 90000 " + Math.floor(10000 + Math.random() * 89999),
        commissionRate: d.commissionRate,
        commissionEnabled: d.commissionRate > 0,
      },
    })
    docMap[d.name] = doc.id
  }
  // link the DOCTOR-role user to a doctor record's name
  if (userMap["DOCTOR"]) {
    await db.user.update({ where: { id: userMap["DOCTOR"] }, data: { name: "Dr. Anjali Rao" } })
  }

  // ── Patients ──
  const firstNames = ["Rajesh", "Lakshmi", "Mohammed", "Sunita", "Anand", "Geeta", "Ibrahim", "Kavya", "Suresh", "Pooja", "Vijay", "Anita", "Faisal", "Meena", "Ganesh", "Ritu", "Praveen", "Shabana", "Naveen", "Divya"]
  const lastNames = ["Sharma", "Iyer", "Khan", "Desai", "Nair", "Pillai", "Reddy", "Gupta", "Menon", "Joshi", "Kapoor", "Bhat", "Sheikh", "Rao", "Patil", "Verma", "Nair", "Ali", "Shetty", "Menon"]
  const patientIds: string[] = []
  for (let i = 0; i < 40; i++) {
    const fn = firstNames[i % firstNames.length]
    const ln = lastNames[i % lastNames.length]
    const gender = i % 3 === 0 ? "Female" : "Male"
    const year = 1955 + (i % 50)
    const month = (i % 12) + 1
    const day = (i % 27) + 1
    const p = await db.patient.create({
      data: {
        organizationId: org.id,
        branchId: i % 3 === 0 ? branch2.id : branch1.id,
        patientCode: `PT${String(i + 1).padStart(5, "0")}`,
        firstName: fn,
        lastName: ln,
        dob: new Date(year, month - 1, day),
        age: new Date().getFullYear() - year,
        gender,
        phone: `+91 9${String(800000000 + i * 137).slice(0, 9)}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
        address: `${i + 1} ${["MG Road", "Brigade Road", "Indiranagar", "Koramangala", "Jayanagar"][i % 5]}`,
        city: "Bengaluru",
        state: "Karnataka",
        bloodGroup: ["A+", "B+", "O+", "AB+", "O-"][i % 5],
        isCorporate: i % 7 === 0,
        corporateName: i % 7 === 0 ? "TechCorp India" : null,
      },
    })
    patientIds.push(p.id)
  }

  // ── Test orders, samples, results, reports ──
  const orderStatuses = ["REGISTERED", "COLLECTED", "PROCESSING", "COMPLETED", "VERIFIED", "APPROVED", "DELIVERED"]
  const allTests = await db.test.findMany({ where: { organizationId: org.id }, select: { id: true, code: true, price: true, referenceRanges: true, unit: true } })
  let orderSeq = 1000
  let sampleSeq = 5000
  let invoiceSeq = 2000
  let reportSeq = 3000
  const receptionistId = userMap["RECEPTIONIST"]
  const pathologistId = userMap["PATHOLOGIST"]
  const labTechId = userMap["LAB_TECHNICIAN"]
  const cashierId = userMap["CASHIER"]

  for (let i = 0; i < 32; i++) {
    const patient = patientIds[i]
    const doctorKeys = Object.keys(docMap)
    const doctorId = docMap[doctorKeys[i % doctorKeys.length]]
    const status = orderStatuses[i % orderStatuses.length]
    const daysAgo = Math.floor(i / 4)
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - i * 3600000)

    // pick 1-4 tests
    const numTests = 1 + (i % 4)
    const chosen = allTests.slice(i % allTests.length, (i % allTests.length) + numTests).length ? allTests.slice(i % allTests.length, (i % allTests.length) + numTests) : allTests.slice(0, numTests)
    const subtotal = chosen.reduce((s, t) => s + t.price, 0)
    const discount = i % 5 === 0 ? Math.round(subtotal * 0.1) : 0
    const payable = subtotal - discount

    const order = await db.testOrder.create({
      data: {
        organizationId: org.id,
        branchId: branch1.id,
        orderCode: `ORD-${++orderSeq}`,
        patientId: patient,
        doctorId,
        createdById: receptionistId,
        status,
        priority: i % 9 === 0 ? "STAT" : i % 4 === 0 ? "URGENT" : "ROUTINE",
        isHomeCollection: i % 8 === 0,
        totalAmount: subtotal,
        discountAmount: discount,
        payableAmount: payable,
        reportDueAt: new Date(createdAt.getTime() + 24 * 3600000),
        createdAt,
        updatedAt: createdAt,
      },
    })

    // create sample + order tests
    const sampleCode = `S-${++sampleSeq}`
    const barcode = `BC${sampleSeq}${Date.now().toString(36).slice(-4)}`
    const sampleType = chosen[0]?.code === "CBC" || chosen[0]?.code === "HB" ? "Whole Blood" : "Serum"
    const tubeType = chosen[0]?.code === "CBC" ? "EDTA" : "SST"
    const sampleStatus = ["REGISTERED"].includes(status) ? "COLLECTED" : ["COLLECTED"].includes(status) ? "RECEIVED" : ["PROCESSING"].includes(status) ? "PROCESSING" : "COMPLETED"
    const sample = await db.sample.create({
      data: {
        organizationId: org.id,
        orderId: order.id,
        sampleCode,
        barcode,
        sampleType,
        tubeType,
        status: sampleStatus,
        collectedAt: createdAt,
        receivedAt: sampleStatus !== "COLLECTED" ? new Date(createdAt.getTime() + 1800000) : null,
        collectedById: userMap["PHLEBOTOMIST"],
        collectorName: "Manoj Pillai",
      },
    })

    for (const t of chosen) {
      const otStatus = ["REGISTERED", "COLLECTED"].includes(status) ? "PENDING" : ["PROCESSING"].includes(status) ? "PROCESSING" : ["COMPLETED", "VERIFIED"].includes(status) ? "COMPLETED" : "APPROVED"
      const ot = await db.orderTest.create({
        data: { orderId: order.id, testId: t.id, price: t.price, status: otStatus, sampleId: sample.id },
      })
      // results for completed+
      if (["COMPLETED", "VERIFIED", "APPROVED", "DELIVERED"].includes(status)) {
        const ranges = t.referenceRanges ? JSON.parse(t.referenceRanges) : []
        const range = ranges[0]
        let value = "—"
        let flag = "NORMAL"
        if (range && typeof range.low === "number") {
          // generate a value, sometimes abnormal/critical
          const r = Math.random()
          let v: number
          if (r < 0.08 && range.criticalLow != null) v = Math.max(0, range.criticalLow - Math.max(0.5, (range.high - range.low) * 0.15))
          else if (r < 0.16 && range.criticalHigh != null) v = range.criticalHigh + Math.max(1, (range.high - range.low) * 0.15)
          else if (r < 0.3) v = range.low - (range.high - range.low) * 0.2
          else if (r < 0.42) v = range.high + (range.high - range.low) * 0.2
          else v = range.low + Math.random() * (range.high - range.low)
          value = v.toFixed(t.unit === "%" ? 1 : v < 10 ? 2 : 0)
          if (range.criticalLow != null && v <= range.criticalLow) flag = "CRITICAL_LOW"
          else if (range.criticalHigh != null && v >= range.criticalHigh) flag = "CRITICAL_HIGH"
          else if (v < range.low) flag = "LOW"
          else if (v > range.high) flag = "HIGH"
        } else {
          value = ["Negative", "Normal", "Within limits", "No abnormalities"][i % 4]
          flag = i % 6 === 0 ? "ABNORMAL" : "NORMAL"
        }
        await db.result.create({
          data: {
            orderTestId: ot.id,
            sampleId: sample.id,
            value,
            unit: t.unit || null,
            flag,
            referenceRange: range ? `${range.low} - ${range.high}` : null,
            enteredById: labTechId,
            approvedById: ["APPROVED", "DELIVERED"].includes(status) ? pathologistId : null,
            status: ["APPROVED", "DELIVERED"].includes(status) ? "APPROVED" : "ENTERED",
            enteredAt: new Date(createdAt.getTime() + 2 * 3600000),
            approvedAt: ["APPROVED", "DELIVERED"].includes(status) ? new Date(createdAt.getTime() + 5 * 3600000) : null,
          },
        })
      }
    }

    // report for approved/delivered
    if (["APPROVED", "DELIVERED"].includes(status)) {
      await db.report.create({
        data: {
          organizationId: org.id,
          orderId: order.id,
          reportCode: `RPT-${++reportSeq}`,
          status: status === "DELIVERED" ? "DELIVERED" : "APPROVED",
          approvedById: pathologistId,
          approvedAt: new Date(createdAt.getTime() + 5 * 3600000),
          pathologistRemarks: "Findings within expected clinical range. Correlate clinically.",
          verificationToken: randomToken(12),
        },
      })
    }

    // invoice
    const paid = i % 3 !== 0 // 2/3 paid
    const invStatus = paid ? "PAID" : i % 3 === 0 && Math.random() < 0.5 ? "PARTIAL" : "UNPAID"
    const paidAmount = paid ? payable : invStatus === "PARTIAL" ? Math.round(payable * 0.5) : 0
    const invoice = await db.invoice.create({
      data: {
        organizationId: org.id,
        branchId: branch1.id,
        invoiceCode: `INV-${++invoiceSeq}`,
        orderId: order.id,
        patientId: patient,
        status: invStatus,
        subtotal,
        discountAmount: discount,
        discountPercent: discount > 0 ? 10 : 0,
        taxAmount: 0,
        totalAmount: payable,
        paidAmount,
        balanceDue: payable - paidAmount,
        invoiceDate: createdAt,
        createdAt,
      },
    })
    for (const t of chosen) {
      await db.invoiceItem.create({
        data: { invoiceId: invoice.id, description: t.code, testId: t.id, quantity: 1, rate: t.price, amount: t.price },
      })
    }
    if (paidAmount > 0) {
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          organizationId: org.id,
          amount: paidAmount,
          mode: ["CASH", "UPI", "CARD", "NETBANKING"][i % 4],
          reference: i % 2 === 0 ? `TXN${invoiceSeq}${i}` : null,
          status: "SUCCESS",
          receivedById: cashierId,
          paidAt: createdAt,
        },
      })
    }
  }

  // ── Suppliers & Inventory ──
  const suppliers = [
    { name: "Lab Supplies Co.", code: "LSC", person: "Ravi" },
    { name: "MediChem Distributors", code: "MCD", person: "Suresh" },
    { name: "BioReagents India", code: "BRI", person: "Anita" },
  ]
  for (const s of suppliers) {
    await db.supplier.create({ data: { organizationId: org.id, name: s.name, code: s.code, contactPerson: s.person, phone: "+91 90000 00000", gstin: "29XYZ1234A1Z5" } })
  }

  const inventory = [
    { name: "Hemoglobin Reagent", code: "REAG-HB", cat: "REAGENT", unit: "mL", qty: 450, reorder: 100, cost: 12, expiry: "2026-06-30" },
    { name: "Glucose Reagent", code: "REAG-GLU", cat: "REAGENT", unit: "mL", qty: 80, reorder: 100, cost: 15, expiry: "2026-03-15" },
    { name: "EDTA Vacutainers", code: "CONS-EDTA", cat: "CONSUMABLE", unit: "pcs", qty: 1200, reorder: 500, cost: 8, expiry: "2027-01-01" },
    { name: "SST Vacutainers", code: "CONS-SST", cat: "CONSUMABLE", unit: "pcs", qty: 320, reorder: 500, cost: 10, expiry: "2027-01-01" },
    { name: "Pipette Tips", code: "CONS-PIP", cat: "CONSUMABLE", unit: "pack", qty: 45, reorder: 50, cost: 250, expiry: null },
    { name: "Cholesterol Reagent", code: "REAG-CHOL", cat: "REAGENT", unit: "mL", qty: 220, reorder: 100, cost: 18, expiry: "2026-09-30" },
    { name: "TSH ELISA Kit", code: "REAG-TSH", cat: "REAGENT", unit: "kit", qty: 8, reorder: 10, cost: 1800, expiry: "2026-02-28" },
    { name: "Microscope Slides", code: "CONS-SLD", cat: "CONSUMABLE", unit: "box", qty: 60, reorder: 30, cost: 120, expiry: null },
    { name: "Hematology Analyzer", code: "EQP-HEM", cat: "EQUIPMENT", unit: "unit", qty: 1, reorder: 0, cost: 450000, expiry: null },
    { name: "Biochemistry Analyzer", code: "EQP-BIO", cat: "EQUIPMENT", unit: "unit", qty: 1, reorder: 0, cost: 380000, expiry: null },
  ]
  for (const inv of inventory) {
    await db.inventoryItem.create({
      data: {
        organizationId: org.id,
        branchId: branch1.id,
        name: inv.name,
        code: inv.code,
        category: inv.cat,
        unit: inv.unit,
        stockQty: inv.qty,
        reorderLevel: inv.reorder,
        reorderQty: inv.reorder * 2,
        costPerUnit: inv.cost,
        expiryDate: inv.expiry ? new Date(inv.expiry) : null,
        location: inv.cat === "EQUIPMENT" ? "Lab Floor" : "Store Room A",
      },
    })
  }

  // ── Notifications ──
  const notifs = [
    { type: "CRITICAL", title: "Critical Value Alert", message: "Hemoglobin result 5.2 g/dL (Critical Low) for patient PT00012 requires immediate pathologist review." },
    { type: "WARNING", title: "Low Stock Warning", message: "Glucose Reagent is below reorder level (80/100 mL). Reorder soon." },
    { type: "WARNING", title: "Reagent Expiring", message: "TSH ELISA Kit expires on 28 Feb 2026. 8 kits remaining." },
    { type: "INFO", title: "Report Approved", message: "Dr. Vikram Singh approved report RPT-3008 for order ORD-1005." },
    { type: "SUCCESS", title: "Payment Received", message: "₹2,499 payment received for invoice INV-2003 via UPI." },
    { type: "INFO", title: "New Registration", message: "Patient PT00040 registered for Full Body Health Checkup." },
  ]
  for (const n of notifs) {
    await db.notification.create({ data: { organizationId: org.id, type: n.type, title: n.title, message: n.message, channel: "IN_APP", read: Math.random() < 0.3 } })
  }

  // ── Settings ──
  await db.setting.create({ data: { organizationId: org.id, key: "report.footer", value: "This report is computer generated and digitally signed. Please correlate with clinical findings." } })
  await db.setting.create({ data: { organizationId: org.id, key: "billing.gstEnabled", value: "true" } })
  await db.setting.create({ data: { organizationId: org.id, key: "verification.baseUrl", value: "/verify" } })

  console.log("✅ Seed complete.")
  console.log(`   Org: ${org.name} (${org.id})`)
  console.log(`   Users: ${users.length} (owner@medicore.example, path@medicore.example, ...)`)
  console.log(`   Tests: ${tests.length}, Patients: 40, Orders: 32`)
  console.log("   Demo user IDs for role switching:")
  for (const u of users) console.log(`     ${u.role.padEnd(16)} ${userMap[u.role]}  (${u.email})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
