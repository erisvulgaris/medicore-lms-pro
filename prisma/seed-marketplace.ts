import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import fs from "fs"

const db = new PrismaClient()

// Rich marketplace seed: 15 labs across 5 cities with real data
const LABS = [
  // Bengaluru
  { name: "MediCore Diagnostics", slug: "medicore-diagnostics", city: "Bengaluru", area: "MG Road", lat: 12.9756, lng: 77.6066, nabl: true, rating: 4.7, fee: 50, radius: 15, featured: true, verified: true, "24x7": false, open: "06:30", close: "21:00", desc: "NABL-accredited multi-specialty diagnostic lab with 500+ tests, state-of-the-art equipment, and a team of expert pathologists. Trusted by 50,000+ patients.", phone: "+91 80 4000 1000" },
  { name: "LifeLab Diagnostics", slug: "lifelab-diagnostics", city: "Bengaluru", area: "Brigade Road", lat: 12.9698, lng: 77.6499, nabl: true, rating: 4.5, fee: 0, radius: 20, featured: true, verified: true, "24x7": false, open: "07:00", close: "20:00", desc: "Premium diagnostic chain with 12 branches across Bengaluru. Specializing in preventive health checkups and corporate wellness programs.", phone: "+91 80 4567 8000" },
  { name: "HealthPoint Labs", slug: "healthpoint-labs", city: "Bengaluru", area: "Indiranagar", lat: 12.9784, lng: 77.6408, nabl: false, rating: 4.2, fee: 75, radius: 12, featured: false, verified: false, "24x7": true, open: null, close: null, desc: "24x7 diagnostic center with home collection. Fast turnaround, digital reports, and affordable pricing for all.", phone: "+91 80 3333 4444" },
  { name: "Apollo Diagnostics", slug: "apollo-diagnostics-bangalore", city: "Bengaluru", area: "Koramangala", lat: 12.9352, lng: 77.6245, nabl: true, rating: 4.6, fee: 60, radius: 18, featured: true, verified: true, "24x7": false, open: "06:00", close: "22:00", desc: "Part of Apollo Hospitals group. World-class diagnostic services with NABL accreditation and international quality standards.", phone: "+91 80 2555 6666" },
  { name: "Thyrocare Labs", slug: "thyrocare-bangalore", city: "Bengaluru", area: "Jayanagar", lat: 12.9250, lng: 77.5938, nabl: true, rating: 4.4, fee: 40, radius: 25, featured: false, verified: true, "24x7": false, open: "06:30", close: "19:30", desc: "India's leading thyroid testing lab. Specialized in hormonal assays, preventive health, and corporate health packages.", phone: "+91 80 2655 7777" },

  // Mumbai
  { name: "Metropolis Healthcare", slug: "metropolis-mumbai", city: "Mumbai", area: "Bandra", lat: 19.0596, lng: 72.8295, nabl: true, rating: 4.6, fee: 80, radius: 20, featured: true, verified: true, "24x7": false, open: "06:00", close: "22:00", desc: "Leading diagnostic chain with 150+ labs across India. NABL-accredited with advanced pathology and molecular diagnostics.", phone: "+91 22 4222 4222" },
  { name: "Dr. Lal PathLabs", slug: "lal-pathlabs-mumbai", city: "Mumbai", area: "Andheri", lat: 19.1197, lng: 72.8468, nabl: true, rating: 4.5, fee: 50, radius: 18, featured: true, verified: true, "24x7": false, open: "06:30", close: "21:00", desc: "One of India's most trusted pathology labs with 2000+ collection centers. Offering 4000+ tests and health packages.", phone: "+91 22 3322 3322" },
  { name: "SRL Diagnostics", slug: "srl-mumbai", city: "Mumbai", area: "Worli", lat: 19.0176, lng: 72.8178, nabl: true, rating: 4.3, fee: 70, radius: 15, featured: false, verified: true, "24x7": false, open: "07:00", close: "20:00", desc: "SRL is one of the largest diagnostic chains in India with 400+ labs. Specialized in oncology and genetic testing.", phone: "+91 22 4444 5555" },

  // Delhi
  { name: "Dr. Lal PathLabs Delhi", slug: "lal-pathlabs-delhi", city: "Delhi", area: "Connaught Place", lat: 28.6315, lng: 77.2167, nabl: true, rating: 4.5, fee: 60, radius: 20, featured: true, verified: true, "24x7": false, open: "06:00", close: "22:00", desc: "Premier pathology lab in the heart of Delhi. NABL-accredited with same-day report delivery for most tests.", phone: "+91 11 4747 4747" },
  { name: "Metropolis Delhi", slug: "metropolis-delhi", city: "Delhi", area: "Saket", lat: 28.5245, lng: 77.2066, nabl: true, rating: 4.4, fee: 75, radius: 18, featured: false, verified: true, "24x7": false, open: "06:30", close: "21:30", desc: "Metropolis Healthcare's Delhi branch. Advanced diagnostics with international quality standards.", phone: "+91 11 4848 4848" },
  { name: "Healthy Labs", slug: "healthy-labs-delhi", city: "Delhi", area: "Rohini", lat: 28.7325, lng: 77.0876, nabl: false, rating: 4.0, fee: 30, radius: 10, featured: false, verified: false, "24x7": true, open: null, close: null, desc: "Affordable 24x7 diagnostic center serving North Delhi. Quick reports and home collection available.", phone: "+91 11 5555 6666" },

  // Hyderabad
  { name: "Vijaya Diagnostic", slug: "vijaya-hyderabad", city: "Hyderabad", area: "Banjara Hills", lat: 17.4156, lng: 78.4347, nabl: true, rating: 4.6, fee: 50, radius: 20, featured: true, verified: true, "24x7": false, open: "06:00", close: "22:00", desc: "South India's leading diagnostic chain with 80+ centers. NABL-accredited with advanced imaging and pathology.", phone: "+91 40 6666 7777" },
  { name: "Apollo Diagnostics Hyderabad", slug: "apollo-hyderabad", city: "Hyderabad", area: "Jubilee Hills", lat: 17.4239, lng: 78.4083, nabl: true, rating: 4.5, fee: 65, radius: 18, featured: false, verified: true, "24x7": false, open: "06:30", close: "21:00", desc: "Apollo Diagnostics in Hyderabad. Part of the Apollo Hospitals group with world-class diagnostic capabilities.", phone: "+91 40 7777 8888" },

  // Chennai
  { name: "Apollo Diagnostics Chennai", slug: "apollo-chennai", city: "Chennai", area: "T. Nagar", lat: 13.0418, lng: 80.2341, nabl: true, rating: 4.5, fee: 55, radius: 20, featured: true, verified: true, "24x7": false, open: "06:00", close: "22:00", desc: "Apollo's flagship diagnostic center in Chennai. Comprehensive test menu with NABL accreditation.", phone: "+91 44 8888 9999" },
  { name: "Chennai Labs", slug: "chennai-labs", city: "Chennai", area: "Adyar", lat: 13.0012, lng: 80.2565, nabl: false, rating: 4.1, fee: 35, radius: 12, featured: false, verified: false, "24x7": false, open: "07:00", close: "20:00", desc: "Local diagnostic lab serving Adyar and surrounding areas. Affordable pricing with quality service.", phone: "+91 44 9999 0000" },
]

const REVIEW_TEMPLATES = [
  { rating: 5, title: "Excellent service!", comment: "Fast report delivery and very professional staff. The home collection was on time and painless. Highly recommend!" },
  { rating: 5, title: "Highly recommended", comment: "NABL certified and it shows. Reports were detailed and easy to understand. Will definitely use again." },
  { rating: 5, title: "Best lab in the area", comment: "Clean facility, courteous staff, and quick results. The online booking system is very convenient." },
  { rating: 4, title: "Good experience", comment: "Clean facility and quick results. Slightly expensive but worth it for the quality of service." },
  { rating: 4, title: "Reliable", comment: "Been using this lab for 2 years. Consistent quality across their branches. Reports are always accurate." },
  { rating: 4, title: "Satisfied", comment: "Good service overall. Home collection was prompt. Reports came within the promised time." },
  { rating: 4, title: "Decent", comment: "Reports are accurate. The app could be better but the lab service is good. Fair pricing." },
  { rating: 3, title: "Average", comment: "Service was okay but had to wait longer than expected. Reports were accurate though." },
  { rating: 3, title: "Could be better", comment: "The lab is fine but the customer support needs improvement. Took multiple calls to get my report." },
  { rating: 2, title: "Disappointed", comment: "Report was delayed by 2 days. No proper communication from the lab. Expected better." },
]

const PATIENT_NAMES = [
  "Rajesh Sharma", "Lakshmi Iyer", "Mohammed Khan", "Sunita Desai", "Anand Nair",
  "Geeta Pillai", "Suresh Reddy", "Priya Menon", "Vijay Kumar", "Anita Bhat",
  "Faisal Sheikh", "Meena Rao", "Ganesh Patil", "Ritu Verma", "Naveen Shetty",
  "Divya Menon", "Praveen Gupta", "Shabana Ali", "Karthik Iyer", "Pooja Joshi",
  "Ramesh Patel", "Fatima Sheikh", "Deepak Kumar", "Sneha Reddy", "Arjun Mehta",
  "Kavya Nair", "Ibrahim Khan", "Sai Teja", "Rohit Deshpande", "Anjali Singh",
]

const TEST_CATALOG = [
  { name: "Complete Blood Count", code: "CBC", shortName: "CBC", dept: "Hematology", price: 350, sample: "Whole Blood", tube: "EDTA", unit: "", tat: 6, ranges: [{ gender: "All", low: 0, high: 0 }] },
  { name: "Fasting Blood Glucose", code: "FBG", shortName: "FBS", dept: "Biochemistry", price: 130, sample: "Plasma", tube: "Fluoride", unit: "mg/dL", tat: 4, ranges: [{ gender: "All", low: 70, high: 100, criticalLow: 50, criticalHigh: 400 }] },
  { name: "HbA1c", code: "HBA1C", shortName: "HbA1c", dept: "Biochemistry", price: 450, sample: "Whole Blood", tube: "EDTA", unit: "%", tat: 8, ranges: [{ gender: "All", low: 4.0, high: 5.6, criticalLow: 0, criticalHigh: 14 }] },
  { name: "Total Cholesterol", code: "TCHOL", shortName: "TC", dept: "Biochemistry", price: 200, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 6, ranges: [{ gender: "All", low: 100, high: 200 }] },
  { name: "Triglycerides", code: "TG", shortName: "TG", dept: "Biochemistry", price: 200, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 6, ranges: [{ gender: "All", low: 50, high: 150 }] },
  { name: "HDL Cholesterol", code: "HDL", shortName: "HDL", dept: "Biochemistry", price: 250, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 6, ranges: [{ gender: "Male", low: 40, high: 60 }, { gender: "Female", low: 50, high: 60 }] },
  { name: "LDL Cholesterol", code: "LDL", shortName: "LDL", dept: "Biochemistry", price: 250, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 6, ranges: [{ gender: "All", low: 0, high: 100 }] },
  { name: "TSH", code: "TSH", shortName: "TSH", dept: "Thyroid", price: 350, sample: "Serum", tube: "SST", unit: "µIU/mL", tat: 8, ranges: [{ gender: "All", low: 0.4, high: 4.5, criticalLow: 0, criticalHigh: 100 }] },
  { name: "T3 Total", code: "T3", shortName: "T3", dept: "Thyroid", price: 300, sample: "Serum", tube: "SST", unit: "ng/dL", tat: 8, ranges: [{ gender: "All", low: 80, high: 200 }] },
  { name: "T4 Total", code: "T4", shortName: "T4", dept: "Thyroid", price: 300, sample: "Serum", tube: "SST", unit: "µg/dL", tat: 8, ranges: [{ gender: "All", low: 5.0, high: 12.0 }] },
  { name: "Urea", code: "UREA", shortName: "Urea", dept: "Biochemistry", price: 150, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 4, ranges: [{ gender: "All", low: 15, high: 40 }] },
  { name: "Creatinine", code: "CREAT", shortName: "Creat", dept: "Biochemistry", price: 150, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 4, ranges: [{ gender: "Male", low: 0.7, high: 1.3 }, { gender: "Female", low: 0.6, high: 1.1 }] },
  { name: "Total Bilirubin", code: "BILIT", shortName: "T.Bili", dept: "Biochemistry", price: 150, sample: "Serum", tube: "SST", unit: "mg/dL", tat: 4, ranges: [{ gender: "All", low: 0.2, high: 1.2 }] },
  { name: "SGPT (ALT)", code: "SGPT", shortName: "ALT", dept: "Biochemistry", price: 180, sample: "Serum", tube: "SST", unit: "U/L", tat: 4, ranges: [{ gender: "All", low: 10, high: 40 }] },
  { name: "SGOT (AST)", code: "SGOT", shortName: "AST", dept: "Biochemistry", price: 180, sample: "Serum", tube: "SST", unit: "U/L", tat: 4, ranges: [{ gender: "All", low: 10, high: 40 }] },
  { name: "Urine Routine", code: "URINE", shortName: "Urine R", dept: "Clinical Pathology", price: 150, sample: "Urine", tube: "Container", unit: "", tat: 4, ranges: [{ gender: "All", low: 0, high: 0 }] },
  { name: "ESR", code: "ESR", shortName: "ESR", dept: "Hematology", price: 150, sample: "Whole Blood", tube: "Citrate", unit: "mm/hr", tat: 4, ranges: [{ gender: "All", low: 0, high: 20 }] },
  { name: "Vitamin D", code: "VITD", shortName: "Vit D", dept: "Biochemistry", price: 800, sample: "Serum", tube: "SST", unit: "ng/mL", tat: 12, ranges: [{ gender: "All", low: 30, high: 100 }] },
  { name: "Vitamin B12", code: "VITB12", shortName: "B12", dept: "Biochemistry", price: 600, sample: "Serum", tube: "SST", unit: "pg/mL", tat: 12, ranges: [{ gender: "All", low: 200, high: 900 }] },
  { name: "Hemoglobin", code: "HB", shortName: "Hb", dept: "Hematology", price: 120, sample: "Whole Blood", tube: "EDTA", unit: "g/dL", tat: 4, ranges: [{ gender: "Male", low: 13.5, high: 17.5, criticalLow: 7, criticalHigh: 20 }, { gender: "Female", low: 12.0, high: 15.5, criticalLow: 7, criticalHigh: 20 }] },
  { name: "Total WBC Count", code: "WBC", shortName: "TLC", dept: "Hematology", price: 150, sample: "Whole Blood", tube: "EDTA", unit: "10^3/µL", tat: 4, ranges: [{ gender: "All", low: 4.0, high: 11.0, criticalLow: 2.0, criticalHigh: 30 }] },
  { name: "Platelet Count", code: "PLT", shortName: "PLT", dept: "Hematology", price: 150, sample: "Whole Blood", tube: "EDTA", unit: "10^3/µL", tat: 4, ranges: [{ gender: "All", low: 150, high: 450, criticalLow: 50, criticalHigh: 1000 }] },
]

const PROFILES = [
  { name: "Thyroid Profile (T3 T4 TSH)", code: "TFT", price: 800, tests: ["TSH", "T3", "T4"] },
  { name: "Lipid Profile", code: "LIPID", price: 700, tests: ["TCHOL", "TG", "HDL", "LDL"] },
  { name: "Liver Function Test", code: "LFT", price: 650, tests: ["BILIT", "SGPT", "SGOT"] },
  { name: "Kidney Function Test", code: "KFT", price: 500, tests: ["UREA", "CREAT"] },
]

const PACKAGES = [
  { name: "Full Body Health Checkup", code: "FBHC", price: 2499, mrp: 3500, tests: ["CBC", "FBG", "HBA1C", "TCHOL", "TG", "HDL", "LDL", "TSH", "T3", "T4", "UREA", "CREAT", "BILIT", "SGPT", "SGOT", "URINE", "ESR", "VITD"] },
  { name: "Diabetes Care Package", code: "DIAB", price: 1299, mrp: 1800, tests: ["FBG", "HBA1C", "UREA", "CREAT", "URINE"] },
  { name: "Women's Health Package", code: "WHP", price: 1999, mrp: 2800, tests: ["CBC", "TSH", "T3", "T4", "VITD", "VITB12", "HB", "BILIT", "SGPT"] },
  { name: "Heart Care Package", code: "HCP", price: 1799, mrp: 2400, tests: ["TCHOL", "TG", "HDL", "LDL", "FBG", "CREAT", "SGOT"] },
  { name: "Senior Citizen Package", code: "SCP", price: 2999, mrp: 4200, tests: ["CBC", "FBG", "HBA1C", "TCHOL", "TG", "HDL", "LDL", "TSH", "T3", "T4", "UREA", "CREAT", "BILIT", "SGPT", "SGOT", "URINE", "ESR", "VITD", "VITB12"] },
]

async function main() {
  console.log("🌱 Seeding rich marketplace data...")

  // Ensure feature flags exist + marketplace enabled
  const flags = [
    { key: "marketplace", label: "Marketplace", description: "Enable the public marketplace", enabled: true },
    { key: "home_collection", label: "Home Collection", description: "Allow home sample collection", enabled: true },
    { key: "online_payments", label: "Online Payments", description: "Accept online payments", enabled: false },
    { key: "cod", label: "Cash on Delivery", description: "Allow cash payment", enabled: true },
    { key: "pickup_system", label: "Pickup System", description: "Pickup agent assignment", enabled: true },
    { key: "referral_program", label: "Referral Program", description: "Customer referral rewards", enabled: false },
    { key: "dynamic_pricing", label: "Dynamic Pricing", description: "Time-based pricing", enabled: false },
    { key: "maintenance_mode", label: "Maintenance Mode", description: "Block ordering", enabled: false },
  ]
  for (const f of flags) {
    await db.featureFlag.upsert({ where: { key: f.key }, update: { enabled: f.enabled }, create: f })
  }

  // Create org + user for the main lab (if not exists)
  const org = await db.organization.upsert({
    where: { code: "MEDLAB" },
    update: {},
    create: {
      name: "MediCore Diagnostics",
      legalName: "MediCore Diagnostics Pvt. Ltd.",
      code: "MEDLAB",
      email: "info@medicore.example",
      phone: "+91 80 4000 1000",
      address: "204, Health Avenue, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
      gstin: "29ABCDE1234F1Z5",
      accentColor: "emerald",
    },
  })

  // Create users with bcrypt
  const users = [
    { name: "Arjun Mehta", email: "owner@medicore.example", role: "ORG_OWNER", branchId: null },
    { name: "Priya Nair", email: "admin@medicore.example", role: "BRANCH_ADMIN", branchId: null },
    { name: "Sneha Reddy", email: "reception@medicore.example", role: "RECEPTIONIST", branchId: null },
    { name: "Rahul Kumar", email: "lab@medicore.example", role: "LAB_TECHNICIAN", branchId: null },
    { name: "Dr. Vikram Singh", email: "path@medicore.example", role: "PATHOLOGIST", branchId: null },
    { name: "Dr. Anjali Rao", email: "doctor@medicore.example", role: "DOCTOR", branchId: null },
    { name: "Manoj Pillai", email: "phleb@medicore.example", role: "PHLEBOTOMIST", branchId: null },
    { name: "Deepa Iyer", email: "cashier@medicore.example", role: "CASHIER", branchId: null },
    { name: "Karthik Menon", email: "accounts@medicore.example", role: "ACCOUNTANT", branchId: null },
  ]
  const credsFile: string[] = ["# MediCore LMS — Generated Credentials", ""]
  for (const u of users) {
    const pw = `${u.role.slice(0, 4).toLowerCase()}@${crypto.randomBytes(4).toString("hex")}`
    const hash = bcrypt.hashSync(pw, 12)
    await db.user.upsert({ where: { organizationId_email: { organizationId: org.id, email: u.email } }, update: { passwordHash: hash }, create: { ...u, organizationId: org.id, passwordHash: hash } })
    credsFile.push(`${u.email} | ${pw} | ${u.role}`)
    console.log(`  ${u.role.padEnd(16)} ${u.email} | ${pw}`)
  }
  fs.writeFileSync("/home/z/my-project/CREDENTIALS.md", credsFile.join("\n"))

  // Create tests for the main org
  const catMap: Record<string, string> = {}
  for (const catName of [...new Set(TEST_CATALOG.map((t) => t.dept))]) {
    const cat = await db.testCategory.create({ data: { organizationId: org.id, name: catName } })
    catMap[catName] = cat.id
  }
  const testMap: Record<string, string> = {}
  for (const t of TEST_CATALOG) {
    const test = await db.test.create({
      data: {
        organizationId: org.id,
        categoryId: catMap[t.dept],
        name: t.name, code: t.code, shortName: t.shortName,
        sampleType: t.sample, tubeType: t.tube, unit: t.unit,
        department: t.dept, referenceRanges: JSON.stringify(t.ranges),
        tatHours: t.tat, price: t.price, cost: Math.round(t.price * 0.4), active: true,
      },
    })
    testMap[t.code] = test.id
  }
  for (const p of PROFILES) {
    const profile = await db.testProfile.create({ data: { organizationId: org.id, name: p.name, code: p.code, price: p.price, active: true } })
    for (const code of p.tests) { if (testMap[code]) await db.testProfileItem.create({ data: { profileId: profile.id, testId: testMap[code] } }) }
  }
  for (const p of PACKAGES) {
    const pkg = await db.testPackage.create({ data: { organizationId: org.id, name: p.name, code: p.code, price: p.price, mrp: p.mrp, active: true } })
    for (const code of p.tests) { if (testMap[code]) await db.testPackageItem.create({ data: { packageId: pkg.id, testId: testMap[code] } }) }
  }

  // Create marketplace labs
  for (const labDef of LABS) {
    // Create org for this lab (or reuse main org for the first one)
    const orgCode = "ML" + labDef.slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)
    let labOrg = org
    if (labDef.slug !== "medicore-diagnostics") {
      labOrg = await db.organization.findUnique({ where: { code: orgCode } })
      if (!labOrg) {
        labOrg = await db.organization.create({
          data: {
            name: labDef.name, code: orgCode,
            email: `info@${labDef.slug}.example`, phone: labDef.phone,
            address: `${labDef.area}, ${labDef.city}`, city: labDef.city,
            state: labDef.city === "Bengaluru" ? "Karnataka" : labDef.city === "Mumbai" ? "Maharashtra" : labDef.city === "Delhi" ? "Delhi" : labDef.city === "Hyderabad" ? "Telangana" : "Tamil Nadu",
          },
        })
      }
    }

    // For non-main labs, create a few tests so they have a catalog
    if (labDef.slug !== "medicore-diagnostics") {
      const existingTests = await db.test.count({ where: { organizationId: labOrg.id } })
      if (existingTests === 0) {
        for (const t of TEST_CATALOG.slice(0, 10)) {
          await db.test.create({
            data: {
              organizationId: labOrg.id, name: t.name, code: `${t.code}-${labDef.slug.slice(0, 3)}`, shortName: t.shortName,
              sampleType: t.sample, tubeType: t.tube, unit: t.unit, department: t.dept,
              referenceRanges: JSON.stringify(t.ranges), tatHours: t.tat,
              price: Math.round(t.price * (0.8 + Math.random() * 0.4)), cost: Math.round(t.price * 0.4), active: true,
            },
          })
        }
      }
    }

    // Create the marketplace lab (find existing by slug, or create)
    let lab = await db.marketplaceLab.findUnique({ where: { slug: labDef.slug } })
    if (lab) {
      lab = await db.marketplaceLab.update({
        where: { id: lab.id },
        data: {
          organizationId: labOrg.id,
          displayName: labDef.name, description: labDef.desc, city: labDef.city,
          address: `${labDef.area}, ${labDef.city}`, latitude: labDef.lat, longitude: labDef.lng,
          phone: labDef.phone, nablCertified: labDef.nabl, open24x7: labDef["24x7"] || false,
          openTime: labDef.open, closeTime: labDef.close, homeCollectionFee: labDef.fee,
          homeCollectionRadius: labDef.radius, featured: labDef.featured, verified: labDef.verified,
          rating: 0, reviewCount: 0, active: true,
        },
      })
    } else {
      lab = await db.marketplaceLab.create({
        data: {
          organizationId: labOrg.id, slug: labDef.slug, displayName: labDef.name, description: labDef.desc,
          address: `${labDef.area}, ${labDef.city}`, city: labDef.city, state: "Karnataka",
          postalCode: "560001", latitude: labDef.lat, longitude: labDef.lng, phone: labDef.phone,
          nablCertified: labDef.nabl, nablCertNumber: labDef.nabl ? `NABL-${labDef.slug.slice(0, 4).toUpperCase()}-2020` : null,
          openTime: labDef.open, closeTime: labDef.close, open24x7: labDef["24x7"] || false,
          homeCollection: true, homeCollectionFee: labDef.fee, homeCollectionRadius: labDef.radius,
          parking: true, wheelchairAccess: Math.random() > 0.5, emergencyService: Math.random() > 0.6,
          verified: labDef.verified, featured: labDef.featured, rating: 0, reviewCount: 0, active: true,
        },
      })
    }

    // Add reviews (5-10 per lab)
    const reviewCount = 5 + Math.floor(Math.random() * 6)
    for (let i = 0; i < reviewCount; i++) {
      const template = REVIEW_TEMPLATES[Math.floor(Math.random() * REVIEW_TEMPLATES.length)]
      const patientName = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)]
      const daysAgo = Math.floor(Math.random() * 90)
      await db.labReview.create({
        data: {
          labId: lab.id, patientName, rating: template.rating,
          title: template.title, comment: template.comment,
          createdAt: new Date(Date.now() - daysAgo * 86400000),
        },
      })
    }

    // Compute and set real rating
    const reviews = await db.labReview.findMany({ where: { labId: lab.id }, select: { rating: true } })
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
    await db.marketplaceLab.update({ where: { id: lab.id }, data: { rating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length } })
  }

  // Create marketplace orders (20+)
  const allLabs = await db.marketplaceLab.findMany()
  const orderStatuses = ["PLACED", "ASSIGNED", "COLLECTED", "IN_LAB", "TESTING", "COMPLETED", "DELIVERED", "CANCELLED"]
  for (let i = 0; i < 25; i++) {
    const lab = allLabs[Math.floor(Math.random() * allLabs.length)]
    const tests = await db.test.findMany({ where: { organizationId: lab.organizationId, active: true }, take: 1 + Math.floor(Math.random() * 3) })
    if (tests.length === 0) continue
    const subtotal = tests.reduce((s, t) => s + t.price, 0)
    const homeCollection = Math.random() > 0.3
    const homeFee = homeCollection ? lab.homeCollectionFee : 0
    const platformFee = Math.round(subtotal * 0.05)
    const total = subtotal + homeFee + platformFee
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)]
    const patientName = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)]
    const daysAgo = Math.floor(Math.random() * 30)
    const otp = homeCollection ? String(Math.floor(1000 + Math.random() * 9000)) : null

    await db.marketplaceOrder.create({
      data: {
        orderCode: `MP-${10001 + i}`,
        labId: lab.id,
        sessionId: `seed-session-${i}`,
        patientName,
        patientPhone: `+91 9${String(800000000 + i * 137).slice(0, 9)}`,
        patientAge: 25 + Math.floor(Math.random() * 50),
        patientGender: Math.random() > 0.5 ? "Male" : "Female",
        address: `${i + 1} Sample Street, ${lab.city}`,
        city: lab.city,
        preferredDate: new Date(Date.now() - daysAgo * 86400000),
        timeSlot: ["07:00-09:00", "08:00-10:00", "16:00-18:00"][Math.floor(Math.random() * 3)],
        homeCollection,
        homeCollectionFee: homeFee,
        testsJson: JSON.stringify(tests.map((t) => ({ testName: t.name, testCode: t.code, price: t.price }))),
        subtotal, discount: 0, taxAmount: 0, platformFee, totalAmount: total,
        paymentMode: "COD", paymentStatus: status === "DELIVERED" || status === "COMPLETED" ? "PAID" : "PENDING",
        status, pickupOtp: otp,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    })
  }

  // Coupons
  const coupons = [
    { code: "WELCOME10", description: "10% off on first order", discountType: "PERCENT", discountValue: 10, maxDiscount: 200, minOrder: 500, validFrom: new Date(), active: true },
    { code: "FLAT100", description: "₹100 off on orders above ₹1000", discountType: "FLAT", discountValue: 100, minOrder: 1000, validFrom: new Date(), active: true },
    { code: "HEALTH20", description: "20% off on health packages", discountType: "PERCENT", discountValue: 20, maxDiscount: 500, minOrder: 1500, validFrom: new Date(), active: true },
    { code: "FIRST50", description: "50% off up to ₹150 for first-time users", discountType: "PERCENT", discountValue: 50, maxDiscount: 150, minOrder: 300, validFrom: new Date(), active: true },
    { code: "MONSOON15", description: "15% off during monsoon season", discountType: "PERCENT", discountValue: 15, maxDiscount: 300, minOrder: 800, validFrom: new Date(), active: true },
  ]
  for (const c of coupons) {
    await db.coupon.upsert({ where: { code: c.code }, update: { active: c.active }, create: c })
  }

  // Settings
  await db.setting.upsert({ where: { organizationId_key: { organizationId: org.id, key: "report.footer" } }, update: {}, create: { organizationId: org.id, key: "report.footer", value: "This report is computer generated and digitally signed." } })
  await db.setting.upsert({ where: { organizationId_key: { organizationId: org.id, key: "billing.gstEnabled" } }, update: {}, create: { organizationId: org.id, key: "billing.gstEnabled", value: "true" } })

  // Final counts
  const finalLabs = await db.marketplaceLab.count()
  const finalReviews = await db.labReview.count()
  const finalOrders = await db.marketplaceOrder.count()
  const finalTests = await db.test.count()
  const finalCoupons = await db.coupon.count()
  console.log(`\n✅ Marketplace seed complete:`)
  console.log(`   Labs: ${finalLabs} | Reviews: ${finalReviews} | Orders: ${finalOrders} | Tests: ${finalTests} | Coupons: ${finalCoupons}`)
  console.log(`   Credentials written to CREDENTIALS.md`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
