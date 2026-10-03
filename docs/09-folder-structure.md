# Complete Folder Structure

```
parkflow/
├── docs/                              # This documentation set
│   ├── 01-executive-summary.md
│   ├── 02-architecture.md
│   ├── 03-database-and-erd.md
│   ├── 04-api-specification.md
│   ├── 05-security-architecture.md
│   ├── 06-deployment-guide.md
│   ├── 07-testing-strategy.md
│   ├── 08-roadmap-and-sprint-plan.md
│   └── 09-folder-structure.md         # (this file)
│
├── docker-compose.yml                 # Local dev: Postgres + backend + frontend
├── .github/workflows/
│   ├── backend-ci.yml                 # Typecheck, lint, test (with a real Postgres service)
│   └── frontend-ci.yml                # Typecheck, lint, test, build
│
├── backend/                           # Express + TypeScript + Prisma API
│   ├── Dockerfile                     # Multi-stage build for Render
│   ├── render.yaml                    # Render Blueprint
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── .eslintrc.cjs
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma              # Full ERD: 14 models, 15 enums
│   │   ├── seed.ts                    # Demo users (one per role) + property + bays
│   │   └── sql/
│   │       └── add-reservation-overlap-constraint.sql   # The anti-double-booking constraint
│   ├── src/
│   │   ├── server.ts                  # Process entry point, graceful shutdown
│   │   ├── app.ts                     # Express app factory: middleware + route mounting
│   │   ├── config/
│   │   │   ├── env.ts                 # zod-validated environment variables
│   │   │   ├── logger.ts              # Winston
│   │   │   └── swagger.ts             # swagger-jsdoc spec builder
│   │   ├── lib/
│   │   │   ├── prisma.ts              # PrismaClient singleton
│   │   │   └── email.ts               # Resend wrapper + email templates
│   │   ├── middleware/
│   │   │   ├── auth.ts                # requireAuth, requireRole
│   │   │   ├── validate.ts            # zod request validation
│   │   │   ├── errorHandler.ts        # Central error -> HTTP response mapping
│   │   │   ├── rateLimiter.ts         # Global + auth-specific limiters
│   │   │   └── asyncHandler.ts        # Wraps async route handlers for error propagation
│   │   ├── utils/
│   │   │   ├── errors.ts              # AppError + factory functions (notFound, conflict, ...)
│   │   │   ├── password.ts            # bcrypt hash/verify, strength check
│   │   │   └── tokens.ts              # JWT sign/verify, opaque refresh token hashing
│   │   └── modules/                   # One folder per business capability
│   │       ├── auth/                  # {schemas, service, routes}.ts - register/login/refresh/...
│   │       ├── users/                 # Profiles, admin listing, invitations, status
│   │       ├── properties/            # CRUD + approval workflow + manager assignment
│   │       ├── parking/               # Zones + slots, bulk generation, block/unblock
│   │       ├── reservations/          # The core booking lifecycle
│   │       ├── visitorPasses/         # Guest pre-registration + gate validation
│   │       ├── notifications/         # In-app notification list/read
│   │       └── audit/                 # recordAudit() helper used by every other module + admin query route
│   └── tests/
│       ├── setup.ts
│       ├── unit/                      # password, tokens, errorHandler
│       └── integration/               # auth flow, RBAC (Supertest against a real app instance)
│
└── frontend/                          # React + TypeScript + Vite + Tailwind
    ├── package.json
    ├── tsconfig.json / tsconfig.node.json
    ├── vite.config.ts                 # Includes vite-plugin-pwa configuration
    ├── vitest.config.ts
    ├── tailwind.config.ts
    ├── .eslintrc.cjs
    ├── .env.example
    ├── index.html
    ├── public/_redirects              # Cloudflare Pages SPA fallback
    └── src/
        ├── main.tsx / App.tsx
        ├── index.css                  # Tailwind + CSS custom properties (light/dark tokens)
        ├── vite-env.d.ts
        ├── app/
        │   ├── router.tsx             # Full route table
        │   ├── UnauthorizedPage.tsx
        │   └── NotFoundPage.tsx
        ├── context/
        │   └── AuthContext.tsx        # Session state, login/logout, revalidation on load
        ├── routes/
        │   ├── ProtectedRoute.tsx     # Redirects to /login if not authenticated
        │   └── RoleGuard.tsx          # Redirects to /unauthorized if role doesn't match
        ├── lib/
        │   ├── apiClient.ts           # axios instance + refresh-on-401 interceptor
        │   ├── authStorage.ts         # localStorage read/write for the session
        │   ├── queryClient.ts         # React Query client config
        │   └── utils.ts               # cn() class-name helper
        ├── hooks/
        │   └── useTheme.ts            # Light/dark mode toggle, persisted
        ├── components/
        │   ├── ui/                    # Button, Input, Label, Card, Badge, Table, Select, Dialog, Alert, Spinner, FormError
        │   └── layout/                # AppShell, Sidebar (role-aware nav), Topbar
        └── features/                  # One folder per screen group: {feature}.hooks.ts (react-query) + {feature}.schemas.ts (zod, where forms exist) + *Page.tsx
            ├── auth/                  # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
            ├── dashboard/             # DashboardPage + notifications unread-count hook
            ├── properties/            # List + detail
            ├── parking/               # Slot grid with block/unblock
            ├── reservations/          # List (approve/reject/cancel) + new-reservation form
            ├── visitors/              # Issue + list visitor passes
            └── admin/                 # User management (invite/suspend) + audit log viewer
```

## Naming conventions

- **Backend modules**: `<name>.schemas.ts` (zod, request validation) → `<name>.service.ts`
  (business logic, the only layer that imports `prisma`) → `<name>.routes.ts` (Express wiring +
  `@openapi` JSDoc + role checks). A route file never contains business logic; a service file
  never touches `req`/`res` directly (routes pass in `req` only where audit logging needs IP/user-agent).
- **Frontend features**: `<name>.hooks.ts` (all React Query `useQuery`/`useMutation` calls for
  that domain) + `<name>.schemas.ts` (zod schemas for any forms) + `<Name>Page.tsx` components.
  A page component never calls `apiClient` directly — always through a hook, so caching/invalidation
  stays in one place per domain.
