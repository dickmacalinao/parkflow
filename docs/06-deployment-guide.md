# Deployment Guide

## Prerequisites

- Node.js 20+, npm
- A [Neon](https://neon.tech) PostgreSQL project
- A [Resend](https://resend.com) API key (optional for local dev — emails just log to console without one)
- GitHub repository with this monorepo (`backend/`, `frontend/` at the root)
- Accounts: [Render](https://render.com), [Cloudflare Pages](https://pages.cloudflare.com)

## 1. Local development

```bash
git clone <your-repo>
cd parkflow

# Postgres for local dev (or point DATABASE_URL at a Neon branch instead)
docker compose up -d postgres

cd backend
cp .env.example .env               # edit DATABASE_URL if not using the compose postgres
npm install
npx prisma migrate dev --name init
psql "$DATABASE_URL" -f prisma/sql/add-reservation-overlap-constraint.sql           # or run below
psql -U postgres -d parkflow -f prisma/sql/add-reservation-overlap-constraint.sql  # if you encounter error running where database_url is not being read from .env file
npm run seed
npm run dev                        # http://localhost:4000, docs at /api/docs

cd ../frontend
cp .env.example .env               # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                        # http://localhost:5173
```

Or run everything via Docker Compose (see `docker-compose.yml` at the repo root):

```bash
docker compose up --build
```

## 2. Database: Neon

1. Create a Neon project. Create a **branch per environment** (`main`/production, `staging`,
   and Neon can auto-create a branch per pull request if you wire up their GitHub integration —
   a natural fit for preview environments).
2. Copy the pooled connection string into `DATABASE_URL` for each environment.
3. Run migrations against each branch before first deploy:
   ```bash
   DATABASE_URL="<neon-connection-string>" npx prisma migrate deploy
   DATABASE_URL="<neon-connection-string>" psql "$DATABASE_URL" -f backend/prisma/sql/add-reservation-overlap-constraint.sql
   DATABASE_URL="<neon-connection-string>" npm --prefix backend run seed   # optional, demo data
   ```

## 3. Backend: Render

`backend/render.yaml` is a Render Blueprint — in the Render dashboard, "New -> Blueprint",
point it at this repo. It builds `backend/Dockerfile` and exposes `/health` as the health check.

Set these in the Render dashboard (marked `sync: false` in the blueprint, so Render won't
auto-generate them):
- `DATABASE_URL` → your Neon connection string
- `CLIENT_URL` → your Cloudflare Pages URL (e.g. `https://parkflow.pages.dev`), used for CORS and email links
- `RESEND_API_KEY` → your Resend key

`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are set to `generateValue: true` — Render generates
strong random values on first deploy; you never have to pick them yourself.

### Troubleshooting: emails aren't sending

Check the backend logs first — `lib/email.ts` logs every send attempt (success, provider
rejection, or "not configured"), so the log line tells you which of these you're hitting:

| Log line | Meaning | Fix |
|---|---|---|
| `Email not sent: no RESEND_API_KEY configured ...` | `RESEND_API_KEY` is missing from the environment | Set it locally in `backend/.env`, and in Render's dashboard (it's `sync: false` in `render.yaml` — Render never generates or sets it for you) |
| `Resend rejected an email send` (with an `error` object) | The API key reached Resend, but Resend refused the send | See below — almost always a domain or recipient issue, not a code problem |
| `Failed to reach Resend` | Network-level failure before Resend responded | Transient; check Resend's status page if persistent |
| No log line at all | Your code isn't calling `sendEmail` on this path, or the request isn't reaching the backend | Confirm the request actually hit the endpoint (check for its `METHOD /path -> status` access log line) |

The two most common causes of a `Resend rejected an email send` error:

1. **`EMAIL_FROM` uses an unverified domain.** The default, `ParkFlow <no-reply@parkflow.app>`,
   is a placeholder — `parkflow.app` isn't a domain you own, so Resend will refuse to send from
   it. In the Resend dashboard, add and DNS-verify your real sending domain, then set `EMAIL_FROM`
   to an address on it. To test quickly without DNS setup, use Resend's sandbox sender
   (`EMAIL_FROM="ParkFlow <onboarding@resend.dev>"`) — but it only delivers to the email address
   your Resend account itself is registered with, so register/reset-password using that address
   while testing.
2. **Recipient restricted by an unverified domain.** Same root cause as above, surfaced as a
   recipient-side rejection instead. You need to register the domain in Resend Dashboard -> Domains

Resend's dashboard has an "Emails" log showing the delivery status and exact rejection reason for
every send attempt — check it directly if the backend log's `error` object isn't clear enough.

## 4. Frontend: Cloudflare Pages

1. In the Cloudflare dashboard: Pages → Create a project → Connect to Git → select this repo.
2. Build settings:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Environment variable: `VITE_API_URL` → your Render API URL + `/api` (e.g. `https://parkflow-api.onrender.com/api`).
4. `public/_redirects` (already in the repo) makes client-side routing work on refresh/deep links.

Alternatively, deploy from the CLI:
```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=parkflow
```

## 5. CI/CD

`.github/workflows/backend-ci.yml` and `frontend-ci.yml` run on every push/PR: install, typecheck,
lint, test (the backend integration tests spin up a Postgres service container). Both Render and
Cloudflare Pages watch the same GitHub repo directly and redeploy on push to `main` once connected
in step 3/4 above — the GitHub Actions workflows are the **quality gate**, not the deploy mechanism,
which keeps the setup simple. (A stricter setup would make Render/Cloudflare deploys *depend on*
the Actions run succeeding, e.g. by only deploying specific branches/tags that passed CI; left as
a configuration exercise for the target Render/Cloudflare account.)

## 6. Post-deploy checklist

- [ ] `GET https://<api>/health` returns `{ status: "ok" }`
- [ ] `GET https://<api>/api/docs` loads Swagger UI
- [ ] Register a test account, confirm the verification email arrives (check Resend's dashboard)
- [ ] Log in, confirm the dashboard loads with no CORS errors in the browser console
- [ ] Rotate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` out of any value used during development
