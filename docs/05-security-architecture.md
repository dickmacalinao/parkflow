# Security Architecture

## Authentication & session security

- Passwords hashed with **bcrypt** (configurable cost factor, default 12) — never stored or logged in plain text.
- **Access tokens** are short-lived JWTs (15 min default). **Refresh tokens** are opaque random
  values; the server stores only a SHA-256 hash, so a database leak doesn't hand out usable
  sessions. Refresh rotates on every use (old token revoked, new pair issued) — a replayed/stolen
  old refresh token stops working the moment the legitimate client refreshes.
- **Account lockout**: 5 failed logins locks the account for 15 minutes. Login failures (including
  for unknown emails) are recorded to the audit log without revealing whether the email exists.
- **Password reset / email verification** tokens are single-use, time-limited (1h / 24h), and a
  password reset revokes every active session.
- Multi-device sessions are visible and individually revocable via `GET/POST /api/auth/sessions`.

## OWASP Top 10 — how each is addressed

| Risk | Mitigation |
|---|---|
| Broken access control | `requireAuth` + `requireRole` on every route; row-level checks (`userCanManageProperty`) in services; non-staff reservation/visitor-pass queries are always scoped to `requestedById`/`hostUserId` server-side, never trusted from the client |
| Cryptographic failures | bcrypt for passwords, SHA-256-hashed refresh tokens, HTTPS enforced at the edge (Cloudflare/Render), secrets only in environment variables |
| Injection | Prisma parameterizes every query — no raw string-concatenated SQL anywhere in the codebase |
| Insecure design | Approval workflows (property, reservation) require a second, differently-privileged actor; destructive actions are soft-deletes, not hard deletes |
| Security misconfiguration | `helmet()` sets secure headers by default; CORS locked to `CLIENT_URL`; `.env.example` ships with placeholder secrets, never real ones |
| Vulnerable components | `npm audit` should run in CI (see `backend-ci.yml` / `frontend-ci.yml`); dependencies pinned to minor versions in `package.json` |
| Auth failures | See "Authentication & session security" above |
| Software/data integrity | CI runs typecheck + tests before any deploy step |
| Logging/monitoring failures | Winston structured logs (JSON in production); every state-changing action writes an `AuditLog` row independent of HTTP logs |
| SSRF | No endpoint accepts an arbitrary URL to fetch server-side in this delivery |

## Input validation & output handling

- Every request body/query/params is parsed through a **zod schema** before touching business
  logic (`middleware/validate.ts`); invalid input never reaches a service function.
- React renders all user-generated content as text by default (no `dangerouslySetInnerHTML`
  anywhere in this codebase), which is the primary XSS defense on the frontend.
- The API is stateless and token-based (no server-side sessions/cookies for the API itself),
  which removes classic CSRF as a concern for API calls; if cookie-based auth is introduced later
  (see the httpOnly-refresh-token hardening note below), add CSRF tokens at that point.

## Rate limiting

- Global: 300 requests / 15 min / IP (`apiRateLimiter`).
- Auth routes: 20 requests / 15 min / IP (`authRateLimiter`), specifically to slow down
  credential stuffing and password-reset abuse.

## Known hardening items for a real production launch

Being direct about what this reference implementation does **not** yet do, so it isn't mistaken
for a finished security review:

1. **Refresh token storage**: currently kept in the frontend's `localStorage` (readable by any
   script on the page — an XSS bug anywhere becomes a session-theft bug). The stronger pattern is
   an `httpOnly`, `Secure`, `SameSite=Strict` cookie for the refresh token, with the access token
   kept only in memory. This requires the backend to set/read that cookie and add CSRF protection
   for the few cookie-authenticated endpoints. Flagged in `lib/authStorage.ts` as well.
2. **No WAF/bot protection** beyond Cloudflare's defaults — add Cloudflare's bot management or
   Turnstile on `/register` and `/forgot-password` before public launch.
3. **No secrets manager** — environment variables are fine for Render/Cloudflare's built-in
   secret storage at this scale, but a dedicated secrets manager (Doppler, AWS Secrets Manager)
   is worth it once multiple services/environments multiply the number of credentials.
4. **No automated dependency scanning wired into CI yet** (e.g. `npm audit --audit-level=high`,
   or GitHub's Dependabot alerts) — straightforward to add to the CI workflow.
5. **File uploads** (avatar, violation photos) are modeled as a URL field only; an actual upload
   endpoint needs virus scanning and a size/type allowlist before accepting user files.
