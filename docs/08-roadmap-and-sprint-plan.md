# Development Roadmap & Sprint Plan

Assumes a small team (2 backend, 2 frontend, 1 QA/PM), 2-week sprints, starting from this delivery.

## Sprint 0 (done — this delivery)
Auth, RBAC, properties, parking inventory, reservations with approval workflow and the
overlap-prevention constraint, visitor passes, audit log, email notifications, CI/CD scaffolding,
representative tests, full documentation set.

## Sprint 1 — Harden the core
- Refresh-token-in-httpOnly-cookie migration (see security doc item #1)
- Full Swagger annotation of every route (currently representative)
- `npm audit` / Dependabot wired into CI
- Violations module: schema exists → build service + routes + attendant UI
- Expand backend/frontend test coverage per the priority list in the testing-strategy doc

## Sprint 2 — Payments & vehicles
- Vehicle registration UI (tenant self-service; currently only the data model + reservation
  linkage exist)
- Stripe integration: payment intent on reservation approval, webhook to mark `Payment.status`
- Receipt email

## Sprint 3 — Reporting
- `GET /api/reports/*` endpoints: occupancy, revenue, violations summaries
- Export to Excel (exceljs) and CSV; PDF via a headless-Chrome or pdfkit renderer
- Scheduled reports (Render Cron Job or BullMQ + Redis) emailing a report on a cadence

## Sprint 4 — Dashboards & analytics
- Charts (recharts or similar) on the admin dashboard: occupancy over time, revenue by property,
  reservation funnel (requested → approved → checked-in → completed)
- KPI tiles matching the business goals' success metrics (occupancy rate, turnover rate, CSAT placeholder)

## Sprint 5 — Messaging & notifications
- WhatsApp Business API / Viber / Messenger integrations behind the existing `NotificationChannel`
  enum (the schema already anticipates this)
- Push notifications for the PWA (service worker is already registered via vite-plugin-pwa;
  needs a push subscription endpoint + VAPID keys)

## Sprint 6 — Access control hardware integration
- Gate barrier / RFID / license-plate-recognition webhook receiver that calls the existing
  check-in/check-out endpoints, so physical hardware can trigger the same state transitions an
  attendant does manually today

## Sprint 7 — Multi-property & polish
- Saved searches, advanced filters, global search across properties/reservations/users
- Accessibility audit against WCAG 2.1 AA (current components use semantic HTML + visible focus
  states as a baseline, but have not been through a full audit)
- Load testing the reservation endpoint specifically (it's the highest-contention path)

## Screen inventory (for reference across sprints)

| Screen | Status | Primary persona |
|---|---|---|
| Login / Register / Forgot / Reset / Verify Email | ✅ | All |
| Dashboard | ✅ (basic KPIs) | All, content varies by role |
| Properties list / detail | ✅ | Admin, Owner, Manager |
| Parking slots grid | ✅ | Admin, Owner, Manager |
| Reservations list + new reservation form | ✅ | All |
| Visitor passes | ✅ | Tenant, Attendant |
| User management | ✅ | Admin |
| Audit log | ✅ | Admin |
| Violations | 📋 | Attendant, Manager |
| Payments / billing history | 📋 | Owner, Tenant |
| Reports | 📋 | Owner, Manager, Admin |
| Vehicle management (tenant self-service) | 📋 | Tenant |
