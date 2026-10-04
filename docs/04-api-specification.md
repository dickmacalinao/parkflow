# API Specification

Base URL: `/api`. Interactive Swagger UI is served at `/api/docs` (raw spec at `/api/openapi.json`)
for endpoints annotated with `@openapi` JSDoc comments — the representative set covering every
module's core operations. This document is the **complete** catalogue, including a few endpoints
marked 📋 Planned that exist in the roadmap but not yet in code.

All responses are JSON. Errors follow `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
Authenticated endpoints require `Authorization: Bearer <accessToken>`.

## Auth (`/api/auth`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | none | Create a TENANT/VISITOR account for an active property, sends verification email |
| POST | `/login` | none | Returns `{ user, accessToken, refreshToken }` |
| POST | `/refresh` | none (refresh token in body) | Rotates refresh token, returns new pair |
| POST | `/logout` | none (refresh token in body) | Revokes one refresh token |
| POST | `/logout-all` | Bearer | Revokes every refresh token for the user |
| GET | `/sessions` | Bearer | Lists active sessions (device, IP, created, expires) |
| POST | `/verify-email` | none | Activates account from emailed token |
| POST | `/forgot-password` | none | Always returns 200; sends email if the address exists |
| POST | `/reset-password` | none | Sets new password from emailed token, revokes all sessions |
| POST | `/change-password` | Bearer | Requires current password, revokes all sessions |

**Example — POST `/auth/login`**
```json
// Request
{ "email": "tenant@parkflow.app", "password": "Passw0rd!" }

// 200 Response
{
  "user": { "id": "...", "email": "tenant@parkflow.app", "role": "TENANT", "status": "ACTIVE" },
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "9f2c...a01"
}

// 401 Response
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password." } }
```

## Users (`/api/users`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | Bearer | Current user's profile |
| PATCH | `/me` | Bearer | Update own profile/preferences/avatar URL |
| GET | `/` | Super Admin, Property Manager | Paginated user list; manager results are scoped to assigned property |
| POST | `/invite` | Super Admin, Property Manager | Invite a user globally as Super Admin or into the manager's assigned property |
| PATCH | `/:id/property` | Super Admin | Assign or reassign a user to an active property (Super Admin remains unassigned) |
| PATCH | `/:id/status` | Super Admin, Property Manager | Activate/suspend/deactivate within permitted scope |
| DELETE | `/:id` | Super Admin | Soft-delete |

## Properties (`/api/properties`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Super Admin | Register a property (status: PENDING_APPROVAL) |
| GET | `/` | Any authenticated | List assigned property; Super Admin can list all |
| GET | `/` with `includeDeleted=true` | Super Admin | List soft-deleted properties |
| GET | `/available` | none | List active properties for account registration |
| GET | `/:id` | Any authenticated | Assigned property detail; Super Admin can access all |
| PATCH | `/:id` | Super Admin or assigned manager/owner | Update |
| PATCH | `/:id/status` | Super Admin | Activate or deactivate |
| POST | `/:id/decision` | Super Admin | Approve or reject a pending property |
| DELETE | `/:id` | Super Admin | Soft-delete |
| POST | `/:id/managers` | Super Admin, assigned Owner/Manager | Assign a Property Manager, with/without approval rights |

## Parking (`/api/parking`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/zones` | Manager+ | Create a zone |
| GET | `/zones?propertyId=` | Any authenticated | List zones with slot counts |
| PATCH | `/zones/:id` | Manager+ | Update |
| DELETE | `/zones/:id` | Manager+ | Soft-delete |
| POST | `/slots` | Manager+ | Create one slot |
| POST | `/slots/bulk` | Manager+ | Generate a numbered range (e.g. A-01..A-24) |
| GET | `/slots` | Any authenticated | List, filter by property/zone/status/type |
| PATCH | `/slots/:id` | Manager+ | Update rate/type |
| PATCH | `/slots/:id/status` | Manager+, Attendant | Block for maintenance / bring back into service |
| DELETE | `/slots/:id` | Manager+ | Soft-delete |

## Reservations (`/api/reservations`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Any authenticated except Super Admin | Request a reservation in the assigned property (status: PENDING) |
| GET | `/` | Any authenticated | List (own only for Tenant/Visitor; all for staff) |
| GET | `/:id` | Any authenticated | Detail (own or staff) |
| POST | `/:id/decision` | Manager+ | Approve/reject a pending reservation |
| POST | `/:id/cancel` | Owner of reservation or staff | Cancel |
| POST | `/check-in` | Attendant, Manager+ | Check in by code or QR token |
| POST | `/:id/check-out` | Attendant, Manager+ | Check out |

**Example — POST `/reservations`**
```json
// Request
{
  "propertyId": "...", "slotId": "...", "type": "TENANT",
  "startAt": "2026-11-01T09:00:00Z", "endAt": "2026-11-03T09:00:00Z"
}

// 201 Response
{ "id": "...", "code": "RES-A1B2C3D4", "status": "PENDING", "amount": "24.00", ... }

// 409 Response (bay already booked for part of that window)
{ "error": { "code": "CONFLICT", "message": "This bay is already reserved for part of that time range." } }
```

## Visitor Passes (`/api/visitor-passes`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Any authenticated | Issue a pass for a guest (QR token generated) |
| GET | `/` | Any authenticated | List (own, or all for staff) |
| POST | `/validate` | Attendant, Manager+ | Validate + mark used at the gate |

## Notifications (`/api/notifications`) — ✅ fully implemented (in-app + email channels)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Bearer | Paginated list + unread count |
| POST | `/:id/read` | Bearer | Mark one read |
| POST | `/read-all` | Bearer | Mark all read |

## Audit (`/api/audit-logs`) — ✅ fully implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | Paginated, filter by property/actor/entityType/action |

## 📋 Planned, not yet implemented

| Area | Endpoint shape | Notes |
|---|---|---|
| Reports | `GET /api/reports/occupancy?propertyId=&from=&to=&format=xlsx\|csv\|pdf` | Needs a report-generation library (e.g. exceljs, pdfkit) and, for large exports, a background job |
| Scheduled reports | `POST /api/reports/schedules` | Needs a job scheduler (e.g. BullMQ + Redis, or Render Cron Jobs) |
| Violations | `POST /api/violations`, `GET /api/violations`, `PATCH /api/violations/:id` | Model exists in schema; service/routes not yet written |
| Payments | `POST /api/payments/intent`, webhook receiver | Needs a payment processor integration (Stripe is the natural fit) |
| Messaging | `POST /api/notifications/send-whatsapp` etc. | Needs WhatsApp Business API / Viber / Messenger platform credentials |
| Saved searches | `POST /api/saved-searches`, `GET /api/saved-searches` | Small addition once a filter-heavy screen (e.g. reservations) needs it |
