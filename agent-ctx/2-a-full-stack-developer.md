# Task 2-a — full-stack-developer

## Scope
Built 4 client-side React view components for the Pathology LMS dashboard:
1. `src/components/views/tests-view.tsx` — `TestsView`: Tests / Profiles / Packages tabs.
2. `src/components/views/appointments-view.tsx` — `AppointmentsView`: date picker + booking dialog.
3. `src/components/views/samples-view.tsx` — `SamplesView`: barcode list + receive / reject actions.
4. `src/components/views/results-view.tsx` — `ResultsView`: result-entry queue + critical-alerts banner.

## Key decisions
- Reused the established conventions exactly: `api` from `@/lib/api-client`, `useApp` from `@/lib/store`,
  shared UI (`PageHeader`, `StatCard`, `EmptyState`, `SectionCard`), format helpers, `SAMPLE_STATUS` /
  `RESULT_FLAG` / `PRIORITY` / `APPOINTMENT_TYPES` constants, TanStack Query, shadcn/ui, lucide-react.
- Tests view groups tests by `department` and parses `referenceRanges` JSON → `${low} - ${high} ${unit}`.
- Appointments view uses a native `<Input type="date">` + prev/next day buttons and a small `StatCard`
  row (Total / Scheduled / Completed) for the selected date. Booking dialog uses a search-then-pick
  patient list (same pattern as orders-view) and shows a home-address Textarea only when type is
  `HOME_COLLECTION`. Local `APPT_STATUS` color map (the constants file does not include appointment
  statuses) and a `TYPE_LABEL` map for friendly APPOINTMENT_TYPES labels.
- Samples view: each row renders a `Barcode` component using `repeating-linear-gradient` to draw
  vertical bars whose width derives from the barcode length, plus the mono barcode text. Receive and
  Reject actions are gated by `can("samples.write")` and hidden for REJECTED/COMPLETED samples. Reject
  opens a Dialog requiring a reason. Both mutate via PATCH `/api/samples/[id]` and invalidate
  `["samples"]` with sonner toasts.
- Results view loads `/api/orders?limit=200` and filters client-side. The Critical Alerts banner
  surfaces orders with `CRITICAL_LOW`/`CRITICAL_HIGH` results. The queue shows orders where any
  `orderTest` has `results.length === 0` OR `results[0].status === "ENTERED"`, each chip showing the
  test's parsed reference range and either the existing entered result (with flag badge) or a
  "pending" amber badge. "Enter Results" button is gated by `can("results.write")` and navigates to
  `order-detail`.

## Verification
- `bun run lint` → 0 errors in the 4 new files (3 pre-existing errors in `page.tsx` / `app-shell.tsx`
  untouched).
- `src/app/page.tsx` already imports + routes to all 4 views; no other files edited.
- Dev server log only complains about sibling views not yet created by parallel subagents.

## Notes for downstream agents / main agent
- These views assume the API response shapes returned by the existing `/api/tests`, `/api/profiles`,
  `/api/appointments`, `/api/samples`, `/api/samples/[id]`, and `/api/orders` routes — verified against
  the route handlers and Prisma schema.
- `navigate("order-detail", id)` and `navigate("patient-detail", id)` are used; those views already
  exist.
- No new routes, no schema changes, no new dependencies.
