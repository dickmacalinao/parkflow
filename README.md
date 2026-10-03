# ParkFlow

Property Parking Reservation & Management Platform — React + TypeScript frontend, Express +
TypeScript + Prisma backend, PostgreSQL (Neon in production).

**Start here:** [`docs/01-executive-summary.md`](docs/01-executive-summary.md) explains exactly
what's implemented, what's scaffolded, and what's documented-but-not-yet-built in this delivery.

## Documentation

| Doc | Contents |
|---|---|
| [01 - Executive Summary](docs/01-executive-summary.md) | Scope, what's done vs. planned |
| [02 - Architecture](docs/02-architecture.md) | System diagram, auth flow, RBAC, deployment architecture |
| [03 - Database & ERD](docs/03-database-and-erd.md) | Full schema, the anti-double-booking constraint |
| [04 - API Specification](docs/04-api-specification.md) | Every endpoint, request/response examples |
| [05 - Security Architecture](docs/05-security-architecture.md) | OWASP Top 10 mapping, known hardening items |
| [06 - Deployment Guide](docs/06-deployment-guide.md) | Local dev, Neon, Render, Cloudflare Pages, step by step |
| [07 - Testing Strategy](docs/07-testing-strategy.md) | What's tested, how to run it, what to add next |
| [08 - Roadmap & Sprint Plan](docs/08-roadmap-and-sprint-plan.md) | 7 sprints from here to full scope |
| [09 - Folder Structure](docs/09-folder-structure.md) | Annotated file tree |

Live API docs once running: `http://localhost:4000/api/docs` (Swagger UI).

## Quick start

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000 (health check at `/health`, Swagger at `/api/docs`)
- Postgres: localhost:5432 (user/pass/db: `parkflow`)

First run needs migrations + seed data (one-time, from your host machine with `psql`/`npm` installed):

```bash
cd backend
DATABASE_URL=postgresql://parkflow:parkflow@localhost:5432/parkflow npx prisma migrate dev --name init
DATABASE_URL=postgresql://parkflow:parkflow@localhost:5432/parkflow psql "$DATABASE_URL" -f prisma/sql/add-reservation-overlap-constraint.sql
DATABASE_URL=postgresql://parkflow:parkflow@localhost:5432/parkflow npm run seed
```

Then log in at http://localhost:5173/login with any seeded account (password `Passw0rd!`):

| Email | Role |
|---|---|
| super.admin@parkflow.app | Super Admin |
| owner@parkflow.app | Property Owner |
| manager@parkflow.app | Property Manager |
| attendant@parkflow.app | Parking Attendant |
| tenant@parkflow.app | Tenant |
| visitor@parkflow.app | Visitor |

## Without Docker

See [`docs/06-deployment-guide.md`](docs/06-deployment-guide.md) §1 for running `backend/` and
`frontend/` directly with `npm run dev`.

## Deploying

See [`docs/06-deployment-guide.md`](docs/06-deployment-guide.md) in full. In short: Neon for the
database, Render for the API (`backend/render.yaml` is a ready-to-import Blueprint), Cloudflare
Pages for the frontend (`frontend/` as the project root, `npm run build`, output `dist`).

## Repository layout

```
parkflow/
├── docs/            Architecture, API spec, deployment, security, roadmap
├── backend/         Express + TypeScript + Prisma API
├── frontend/        React + TypeScript + Vite + Tailwind SPA (PWA)
├── docker-compose.yml
└── .github/workflows/
```

Full annotated tree: [`docs/09-folder-structure.md`](docs/09-folder-structure.md).
