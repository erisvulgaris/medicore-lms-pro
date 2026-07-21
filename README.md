# MediCore LMS — Pathology Laboratory Management System

An open-source, multi-tenant **Pathology Laboratory Management System** built for small labs and diagnostic centres. Manage the full diagnostic lifecycle — from patient registration and sample collection through result entry, pathologist approval, report delivery, billing, and financial reporting.

Built with **Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma ORM (SQLite, PostgreSQL-ready)**.

## 🔐 Authentication & Security

- **Real bcrypt password hashing** (12 rounds) — no plaintext passwords stored
- **JWT token-based sessions** — 7-day expiry, stored in `Session` table (revocable)
- **RBAC enforced at API layer** — every route checks permissions via `requirePermission()`
- **Zod input validation** on all write endpoints (patients, orders, results, payments, inventory, appointments, doctors, login)
- **Structured JSON logging** to stdout for production observability
- **Session revocation** — logout deletes the session token from DB
- **Inactive user blocking** — `active: false` users cannot authenticate

### Login Flow
1. POST `/api/auth/login` with `{ email, password }` → returns `{ token, user, organization }`
2. Frontend stores token in `localStorage` and sends `Authorization: Bearer <token>` on all requests
3. Server validates token via `Session` table (checks expiry + existence) on every request
4. POST `/api/auth/logout` revokes the session

### Generated Credentials
Run `bun run prisma/seed.ts` to generate real bcrypt-hashed accounts. Credentials are written to `CREDENTIALS.md` (gitignored). The seed generates a unique password per role:

| Role | Email | Password (example — re-seed to get yours) |
|---|---|---|
| Organization Owner | owner@medicore.example | `org_@<hex>` |
| Branch Admin | admin@medicore.example | `bran@<hex>` |
| Receptionist | reception@medicore.example | `rece@<hex>` |
| Lab Technician | lab@medicore.example | `lab_@<hex>` |
| Pathologist | path@medicore.example | `path@<hex>` |
| Doctor | doctor@medicore.example | `doct@<hex>` |
| Phlebotomist | phleb@medicore.example | `phle@<hex>` |
| Cashier | cashier@medicore.example | `cash@<hex>` |
| Accountant | accounts@medicore.example | `acco@<hex>` |

## ✨ Key Features

### Quick Lab (Small-Lab Optimized)
A single-screen **operator console** designed for small labs where one person does everything:
- **One-click workflow slider** — advance orders through all stages (Registered → Collected → Processing → Completed → Verified → Approved) with a single click, no page navigation
- **Inline result entry** — enter test results directly in the queue without opening detail pages
- **Bulk operations** — select multiple orders and advance them all at once
- **Express registration** — patient + test order + sample collection + payment in one 3-step form

### Core Modules
- **Dashboard** — revenue/patient charts, TAT compliance gauge, sample aging, critical alerts, activity feed
- **Patients** — registration, search, detail timeline, duplicate detection
- **Appointments** — walk-in, scheduled, home collection, token system
- **Test Orders** — full 8-stage lab workflow with progress bars and inline quick-advance
- **Sample Collection** — barcode generation, receive/reject tracking
- **Result Entry** — auto-calculated flags (Normal/Low/High/Critical) from reference ranges
- **Reports** — printable PDF reports with QR verification, digital signature, pathologist approval
- **Billing** — GST invoices, payments, outstanding tracking, multiple payment modes
- **Finance Reports** — daily collection, GST report, outstanding aging, P&L, day closing
- **Inventory** — reagents/consumables, low-stock alerts, expiry tracking, stock adjustments
- **Purchase Orders** — suppliers, POs, GRN
- **Lab Analytics** — TAT compliance, sample aging, per-test breakdown
- **Commission Reports** — doctor referral analytics with compliance notes
- **Home Collection** — route planning grouped by area
- **Barcode Labels** — printable sample labels with barcode visuals
- **Patient Portal** — self-service reports, invoices, secure sharing
- **Doctor Portal** — referred patients, reports, referral analytics
- **Audit Log** — immutable record of all actions

### Architecture
- **Multi-tenant** — `organizationId` on every table, enforced at the API layer
- **RBAC** — 10 roles (Super Admin → Patient) with granular permission sets
- **Clean architecture** — UI → API → Service → Data (Prisma)
- **PostgreSQL-ready** — no SQLite-specific SQL; migration requires minimal changes
- **Lazy-loaded views** — optimized for performance

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Set up the database
cp .env.example .env
bun run db:push

# Seed demo data (1 org, 9 users, 40 patients, 32 orders, full inventory)
bun run prisma/seed.ts

# Start the dev server
bun run dev
```

Open `http://localhost:3000` and pick a role on the login screen.

### Demo Credentials
The seed script creates 9 users (one per role). Pick any on the role-gate login screen:
- **Organization Owner** — full access
- **Pathologist** — result approval, report signing
- **Lab Technician** — sample collection, result entry
- **Receptionist** — registration, billing
- **Cashier** — payments
- **Accountant** — finance reports
- And more...

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| UI | Tailwind CSS 4, shadcn/ui, Lucide icons, Recharts |
| State | Zustand, TanStack Query |
| Database | Prisma ORM → SQLite (PostgreSQL-ready) |
| Auth | RBAC via permission matrix (session header-based demo) |
| Forms | React Hook Form + Zod |

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # Route handlers (35 endpoints)
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── orders/       # + bulk-advance, quick-result
│   │   ├── express-register/
│   │   ├── analytics/    # tat, finance, commissions
│   │   ├── portal/       # patient, doctor
│   │   └── ...
│   ├── page.tsx          # Single-page dashboard with view router
│   └── layout.tsx
├── components/
│   ├── views/            # 27 view modules
│   ├── ui/               # shadcn/ui components
│   ├── app-shell.tsx     # Sidebar + topbar + role switcher
│   └── command-palette.tsx
└── lib/
    ├── db.ts             # Prisma client
    ├── permissions.ts    # RBAC matrix
    ├── constants.ts      # Workflow states, flags, reference ranges
    ├── session.ts        # requireUser/requirePermission
    ├── format.ts         # Currency, date, number formatting
    ├── csv.ts            # CSV export utility
    └── store.ts          # Zustand app store
prisma/
├── schema.prisma         # 24 models, multi-tenant
└── seed.ts               # Realistic demo data
```

## 🔐 RBAC Roles

| Role | Capabilities |
|---|---|
| Super Admin | Full system access across all organizations |
| Organization Owner | Full control of own lab & all branches |
| Branch Admin | Manage assigned branch(es) |
| Receptionist | Registration, billing, appointments |
| Lab Technician | Collection, processing, result entry |
| Pathologist | Approve reports, digital signature, critical alerts |
| Doctor | Refer patients, view reports |
| Phlebotomist | Home collection, sample status |
| Cashier | Payments, refunds, daily settlement |
| Accountant | Financial reports, GST, expenses |

## 📊 Workflow State Machine

```
Registered → Collected → Processing → Completed → Verified → Approved → Delivered → Archived
```

Each transition is audited. The **Quick Lab** view lets operators advance through these stages with a single click on the inline stepper.

## 📄 License

Open-source. Free to use, modify, and distribute.

## 🤝 Contributing

This is an open-source project. Contributions welcome — please ensure all changes pass `bun run lint` and maintain multi-tenant isolation.

## 🏪 Marketplace Module (Optional — Feature Flag Controlled)

The platform includes an optional **healthcare marketplace** (like Zomato/Swiggy for pathology labs) that can be enabled/disabled instantly via Feature Flags — no code changes required.

### Feature Flags
Super Admin controls marketplace features from **Settings → Feature Flags**:
- `marketplace` — Enable/disable the entire public marketplace
- `home_collection` — Allow home sample collection
- `online_payments` — Accept online payments (gateway integration ready)
- `cod` — Cash on Delivery / Cash on Collection
- `pickup_system` — Pickup agent assignment & logistics
- `referral_program` — Customer referral rewards
- `dynamic_pricing` — Time/demand-based pricing rules
- `maintenance_mode` — Block ordering during maintenance

When `marketplace` is OFF: all marketplace APIs return 403, public routes are hidden, only the staff LMS remains accessible.

### Marketplace Public Routes
- `/?marketplace=1` — Discover nearby labs (with OpenStreetMap, filters, ratings)
- `/?marketplace=lab&slug=medicore-diagnostics` — Lab detail (tests, profiles, packages, reviews, map)
- `/?marketplace=cart&sessionId=X` — Shopping cart + checkout
- `/?marketplace=orders&sessionId=X` — Order history

### Marketplace APIs
- `GET /api/marketplace` — Check if marketplace is enabled
- `GET /api/marketplace/labs` — List labs (with filters: q, city, lat/lng, radius, sort, nabl, homeCollection)
- `GET /api/marketplace/labs/[slug]` — Lab detail with tests, profiles, packages, reviews
- `POST/GET/DELETE /api/marketplace/cart` — Cart management (session-based, single-lab cart)
- `POST/GET /api/marketplace/orders` — Place order (with coupon, home collection, OTP) + order history
- `POST/GET /api/marketplace/reviews` — Submit/list reviews (auto-updates lab rating)
- `GET/PATCH /api/feature-flags` — Admin feature flag management

### Marketplace Data Models
- `MarketplaceLab` — Public lab profile (NABL, hours, home collection, geo, ratings, facilities)
- `LabReview` — Patient reviews with photos, moderation
- `Cart` / `CartItem` — Session-based shopping cart
- `MarketplaceOrder` — Full order lifecycle (PLACED → ASSIGNED → COLLECTED → IN_LAB → TESTING → COMPLETED → DELIVERED)
- `Coupon` — Discount codes (PERCENT/FLAT, min order, max discount, usage limits)
- `FeatureFlag` — DB-backed feature toggles

### Order Flow
```
Search → Compare → Select Lab → Add Tests → Checkout → Choose Address
→ Select Slot → Pay (COD/Online) → Pickup Assigned → Sample Collected
→ Delivered to Lab → Testing → Report Uploaded → Customer Notified
```
