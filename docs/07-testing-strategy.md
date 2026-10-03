# Testing Strategy

| Layer | Tool | What's covered in this delivery |
|---|---|---|
| Backend unit | Vitest | Password hashing/strength, JWT sign/verify, refresh token hashing, central error handler's status-code mapping |
| Backend integration | Vitest + Supertest | Register→login-before-verification flow, validation error shape, RBAC rejection (401/403) on a protected admin route |
| Frontend component | Vitest + React Testing Library | `Button` component (click handling, loading/disabled state) as a representative example |
| Frontend E2E | 📋 Planned (Playwright) | Full login→reserve→approve journey across both apps |

## Why this subset, honestly

A "complete" test suite for a system this size is hundreds of test cases. What's included here
demonstrates the **patterns** correctly wired end-to-end (test runner config, a real Postgres
service container in CI, RTL setup with jsdom, mocking strategy) so that extending coverage
module-by-module is mechanical, not a research project. The highest-value next tests to add,
in order:

1. `reservations.service.test.ts` — overlap detection, pricing (`priceStay`), the exclusion-constraint
   catch path (requires a real Postgres, so it's an integration test, not a unit test)
2. `properties.service.test.ts` — `userCanManageProperty` row-level authorization logic
3. Frontend: `LoginPage` and `NewReservationPage` form validation (RHF + zod resolver), mocking `apiClient`
4. E2E: one happy-path spec per persona (tenant books, manager approves, attendant checks in)

## Running tests

```bash
# Backend (integration tests need a reachable Postgres - see docker-compose.yml)
cd backend
npm test

# Frontend
cd frontend
npm test
```

## CI test execution

`backend-ci.yml` spins up a `postgres:16` service container, runs `prisma db push` against it,
then `npm test` — so the integration tests in `tests/integration/` run against a real database on
every push, not just unit tests against mocks.
