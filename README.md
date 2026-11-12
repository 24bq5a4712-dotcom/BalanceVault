# BalanceVault

BalanceVault is a React + Vite client and Express API starter for the Snovasys
Fresher Hiring Challenge 2026. The API uses PostgreSQL through Prisma and Redis
for API rate limits and server-side sessions.

## Requirements and local setup

- Node.js 20.19+ or 22.12+, plus npm
- PostgreSQL and Redis running locally or on reachable development services

1. Run `npm install`.
2. Copy `server/.env.example` to `server/.env`.
3. Configure `DATABASE_URL` and `REDIS_URL` for your services. Set
   `SESSION_SECRET` to a private, randomly generated value of at least 32
   bytes, using:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   Do not use the example placeholder or commit `.env` files.
4. Run `npm run db:generate` and `npm run db:migrate`.
5. Start both applications with `npm run dev`.

The client is served at `http://localhost:5173`, and the API listens on
`http://localhost:3000`.

## Implemented API foundation

- `GET /api/health` is a liveness check.
- `GET /api/ready` probes PostgreSQL and Redis and returns `503` unless both
  respond successfully.
- `GET /api/auth/csrf` starts a session and returns a CSRF token. Send that
  token in `x-csrf-token` on every state-changing API request.
- `POST /api/auth/register` creates a `HOLDER` account and signs it in.
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, and
  `POST /api/auth/password` implement authentication and session operations.
- `GET|POST /api/accounts`, `PATCH|DELETE /api/accounts/:accountId` provide
  account-holder-owned account metadata management. New account balances begin
  at zero; there are no money movement or balance-update endpoints.
- Admin routes under `/api/admin` manage users, issue temporary passwords,
  and read the newest audit events. A temporary password must be changed before
  using account or admin features.
- User registration never accepts a requested role. Role checks and account
  ownership are enforced in the API.
- The React client is connected to these endpoints: it provides sign-up/sign-in,
  account overview and management, password change, and an admin workspace for
  onboarding, role/status updates, temporary-password reset, and audit review.
- Admin-issued temporary passwords are generated in the browser, displayed
  once after successful creation/reset, and must be delivered to the user
  out-of-band by the administrator.

Sessions are stored in Redis and use an HTTP-only, SameSite=Lax cookie. Cookies
are marked Secure when `NODE_ENV=production`; production deployment must use
HTTPS. Mutations require a session CSRF token and reject mismatched browser
origins. Rate-limited routes fail closed when Redis is unavailable.

### One-time administrator bootstrap

After applying migrations, set `BOOTSTRAP_ADMIN_EMAIL` and
`BOOTSTRAP_ADMIN_PASSWORD` in the local process environment, then run
`npm run admin:bootstrap`. The command creates an administrator only if no
administrator exists, writes an audit event, and refuses subsequent bootstrap
attempts. Do not put the password in a checked-in file or shell command history.
Admin-created users receive a temporary password out-of-band from the operator;
this scaffold does not send email or deliver invitations.

### Database and tests

- `npm run db:migrate` applies development migrations.
- `npm run db:deploy` applies checked-in migrations in deployment environments.
- `npm run db:generate` generates Prisma Client.
- `npm test` runs backend HTTP tests for CSRF, registration/login, session
  rotation, RBAC, account ownership, admin onboarding, password changes, and
  audit events, plus client tests for login, rate-limit, and CSRF error messages.
- `npm run test:integration` runs live API checks against the configured
  PostgreSQL and Redis services. It creates a run-scoped test administrator,
  holders, and an account, then removes those test records during cleanup. Run
  it only against a disposable or backed-up non-production database.
- `npm run build` builds the Vite client.

The regular backend tests use an in-memory repository and session store. The
client tests cover API error-message mapping. The integration test exercises
real PostgreSQL, Redis sessions, and API routes through the rate-limit
middleware; it does not assert rate-limit thresholds or Redis-outage behavior.
`GET /api/ready` also checks both services at runtime.
Production hosting is not configured; see the deployment-readiness checklist
in [docs/development.md](docs/development.md) before choosing a host.

## Structure

- `client/` — Vite/React application connected to the authentication, account,
  and admin APIs.
- `server/src/config/` — environment, Prisma, Redis, and session configuration.
- `server/src/middleware/` — CSRF, authentication/authorization, and rate
  limiting.
- `server/src/routes/` — health, auth, account, and admin APIs.
- `server/src/services/` — validation, audit events, and admin bootstrap.
- `server/prisma/` — PostgreSQL schema and initial migration.
- `server/test/` — API tests and an in-memory test repository.
- `docs/` — architecture and local development notes.
- `THREATS.md` — current controls, remaining risks, and production caveats.
- `PROMPTS.md` — stack restrictions and project implementation guidance.

This is an early challenge foundation, not a production-ready banking system.
It does not implement email verification, account recovery, MFA, financial
transactions, external bank connections, or tamper-proof audit storage.
