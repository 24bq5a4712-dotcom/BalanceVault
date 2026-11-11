# BalanceVault final submission audit

**Audit date:** 2026-11-11  
**Scope:** Requirements explicitly supplied in the project conversation and
verifiable repository evidence. No source/configuration files or Git history
were modified. Temporary live-test records were removed and cleanup verified.

## Requirements basis and unavailable challenge items

The requirements available in the conversation explicitly cover the React/Vite,
Express, PostgreSQL/Prisma, and Redis stack; initial project configuration;
health/readiness; responsive UI; authentication and secure sessions; holder and
admin authorization; owner-scoped account metadata; admin bootstrap, onboarding,
and management; audit logs; and meaningful tests.

The ten functional requirements of the challenge are not enumerated in the
materials available to this audit or found in repository documentation. They
are therefore marked unavailable below; no feature names or acceptance
criteria have been inferred. This audit cannot certify challenge-wide feature
completeness until those exact ten requirements are available for mapping.

## Ten challenge requirements unavailable for verification

| Requirement | Status | Evidence | Risk / action |
|---|---|---|---|
| Challenge functional requirement 1 | Unavailable for verification | The numbered ten-item functional list is not present in the available conversation text or repository files. | Do not infer the feature. Compare against the original challenge text before claiming completeness. |
| Challenge functional requirement 2 | Unavailable for verification | Same limitation; no requirement-specific source or acceptance criterion can be reliably identified. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 3 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 4 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 5 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 6 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 7 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 8 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 9 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |
| Challenge functional requirement 10 | Unavailable for verification | Same limitation. | Map the exact requirement to source and a test when its wording is available. |

## Explicitly supplied project requirement audit

| Requirement | Status | Repository evidence | Verification and remaining gap |
|---|---|---|---|
| Use React/Vite, Express, PostgreSQL/Prisma, Redis | Implemented | [Root workspace](../package.json), [client package](../client/package.json), [server package](../server/package.json), [Vite proxy](../client/vite.config.js), and [Prisma schema](../server/prisma/schema.prisma). | Live integration completed against PostgreSQL and Redis. This does not establish production deployment readiness. |
| Clean folder structure, environment examples, scripts, and no committed secrets | Implemented locally; Git status unavailable | `client/`, `server/`, `docs/`; [server/.env.example](../server/.env.example); root and workspace package scripts; [.gitignore](../.gitignore) excludes `.env` and `.env.*` while allowing `.env.example`. The actual `.env` is present locally and its secret was checked without displaying it. | The workspace and its parent have no `.git` directory. Whether `.env` was ever committed, whether the ignore rule is effective in history, and which files would be submitted cannot be verified. |
| Health and readiness endpoints | Implemented | [`createHealthRouter`](../server/src/routes/health.js) implements `/api/health` and `/api/ready`. | Live readiness returned HTTP 200 with PostgreSQL and Redis marked `ok`. Outage-path behavior was not retested here. |
| Responsive fintech UI foundation | Implemented in source | Active UI is [BalanceVaultApp.jsx](../client/src/BalanceVaultApp.jsx); styles include responsive breakpoints in [styles.css](../client/src/styles.css). | Browser testing covered the holder journey at the available viewport only. No mobile/tablet viewport or accessibility automation is checked in. |
| Registration, login, password change, logout, and secure sessions | Implemented; session revocation partial | [`createAuthRouter`](../server/src/routes/auth.js) and [`createSessionMiddleware`](../server/src/config/session.js) implement these flows. Sessions use Redis, HTTP-only/Lax cookies, login/registration ID regeneration, and production Secure cookies. | Unit tests: 3/3 passed. A browser registration/account/logout flow passed. Admin password reset does not revoke all existing sessions; add revocation and tests. |
| Holder/admin RBAC, owner-only account operations | Implemented | [`createAuthMiddleware`](../server/src/middleware/auth.js), [account routes](../server/src/routes/accounts.js), and [admin routes](../server/src/routes/admin.js). Account operations are owner-filtered; wrong-owner IDs return 404. | Unit and live integration suites passed. Tests cover holder/admin denial, owner isolation, temporary password gating, and suspended users. Rate-limit exhaustion/fail-closed behavior is not directly tested. |
| First-admin bootstrap and admin login | Implemented; no permanent admin currently exists | [`bootstrapAdmin`](../server/src/services/adminBootstrap.js) and [bootstrap CLI entrypoint](../server/src/scripts/bootstrapAdmin.js). | A temporary first admin was created through the CLI entrypoint and logged in successfully to the live API; role was `ADMIN`. The test admin was removed. After cleanup the configured database had **0 admins / 0 active admins**, and bootstrap credential environment variables were absent. This does not verify a user-owned admin account or credentials. |
| Admin onboarding, user management, temporary passwords, audit visibility | Implemented with coverage gaps | [`createAdminRouter`](../server/src/routes/admin.js) and [`AdminView`](../client/src/BalanceVaultApp.jsx) implement user creation, role/status updates, password reset, and audit display. | Live integration passed admin login, user onboarding, and selected audit visibility using a test admin. Unit tests cover role/status changes and audit access denial. An expanded ad-hoc live sequence had two intermittent HTTP 403 responses at the admin login step, while isolated bootstrap/login probes succeeded. Cause was not established; investigate before relying on repeatable live admin workflows. The active admin dashboard was not exercised end-to-end in a browser. |
| Audit logging for account/auth/admin operations | Partially implemented | [`auditEvent`](../server/src/services/audit.js); account/admin mutations generally write audit rows transactionally; admin-only `/audit-logs` in [admin.js](../server/src/routes/admin.js). | Unit tests passed selected auth/account/admin audit assertions. Live integration passed onboarding/password/account audit assertions. The browser test confirmed its account create/update/close and logout audit actions before cleanup. No external tamper-resistant retention, audit-read logging, or rollback-failure test exists. |
| PostgreSQL/Prisma data model and migration | Implemented for users, account metadata, and audit events | [schema.prisma](../server/prisma/schema.prisma) and [initial migration](../server/prisma/migrations/20261111190000_initial_auth_accounts_audit/migration.sql). | Live database queries and CRUD integration passed. No transaction/ledger model, financial constraints, production backup test, or least-privilege database verification is present. Prisma validation/migration status was not rerun in this audit. |
| Meaningful security and integration tests | Partially implemented | [auth.test.js](../server/test/auth.test.js) contains three broad unit/API tests; [integration.live.js](../server/test/integration.live.js) exercises live PostgreSQL/Redis. | `npm test`: **3/3 passed**. `npm run test:integration`: **1/1 passed**. Browser registration plus account create/edit/close/logout passed; its exact user/account/audit records were removed and cleanup verified. No checked-in browser test, production-cookie test, Redis limiter failure test, concurrent-admin test, or audit rollback test. |

## Security and authorization findings

### Controls evidenced in source and tests

- Passwords are bcrypt-hashed; returned user projections omit hashes. Login
  compares a dummy hash for an unknown email in [auth.js](../server/src/routes/auth.js).
- Login and registration regenerate session IDs. Redis stores server-side
  sessions; CSRF tokens and Origin checks protect mutations in
  [session.js](../server/src/config/session.js) and
  [csrf.js](../server/src/middleware/csrf.js).
- Active user status and current role are reloaded from PostgreSQL for
  protected requests in [auth middleware](../server/src/middleware/auth.js).
- Account and admin routers apply role checks; account queries and mutations
  include the authenticated owner ID in [accounts.js](../server/src/routes/accounts.js).
- Admin changes prevent self-removal of admin access and protect the final
  active administrator in [admin.js](../server/src/routes/admin.js).
- Redis-backed API/auth rate limiters use `passOnStoreError: false` in
  [rateLimiter.js](../server/src/middleware/rateLimiter.js). The fail-closed
  property is source-evidenced, not demonstrated by an outage/threshold test.
- `helmet`, exact-origin credentialed CORS, JSON size cap, and generic 500
  responses are configured in [app.js](../server/src/app.js).

### Material security gaps

1. **High — dependency advisory remains.** Current `npm audit` reports three
   high-severity entries in one dependency chain: `deepmerge-ts` 7.1.5 is
   pinned by Prisma config 6.19.3 and is affected by recursive-merge stack
   exhaustion (GHSA-ggr8-5vv4-36mx). The Prisma config and CLI entries are
   dependent findings, not three unrelated flaws. Plan and test a compatible
   Prisma upgrade; no forced upgrade or unverified override was applied.
2. **High — no persistent administrator in the configured database.** The
   audit confirmed zero admins after scoped test cleanup. Create and verify the
   intended first admin through the protected bootstrap procedure before
   submission/deployment. Do not treat the temporary test admin as an
   operational account.
3. **High — intermittent live admin login in longer test sequences.** Two
   expanded attempts received HTTP 403 during admin login; isolated bootstrap
   and live login probes succeeded. The cause was not identified. Check
   rate-limit/session/CSRF behavior under repeated local test sequences and
   make the test deterministic before claiming repeatable admin E2E coverage.
4. **Medium — admin password reset does not revoke existing sessions.** The
   reset marks `mustChangePassword`, which blocks account/admin actions when
   the user is reloaded, but Redis sessions are not revoked. Implement
   per-user session versioning/revocation and test existing-session
   invalidation.
5. **Medium — security test gaps.** No checked-in test exercises rate-limit
   thresholds or Redis failure behavior, production `Secure` cookie behavior,
   session revocation, audit-write rollback, concurrent last-admin changes, or
   malformed/oversized request bodies.
6. **Medium — audit logs are database records, not tamper-proof evidence.**
   No independent append-only sink, retention policy, or audit-read events are
   implemented. This is documented in [THREATS.md](../THREATS.md).
7. **Medium — request error semantics need negative tests.** Current validation
   covers common fields, but malformed body shapes and JSON parser errors do
   not have route-level tests; the generic error handler may report some client
   input failures as 500.

## PROMPTS.md, Git history, and submission evidence

- [PROMPTS.md](../PROMPTS.md) documents the fixed stack, current implementation
  facts, and engineering constraints. It is not a traceability/evidence log:
  it does not preserve the challenge’s ten functional requirements, link each
  requirement to source/tests, or record verification results.
- No `.git` directory exists in the BalanceVault workspace or its parent.
  `git status` and `git log` therefore cannot establish a clean tree, commit
  sequence, authorship, or whether credentials ever entered history.
- [.gitignore](../.gitignore) excludes `.env` and `.env.*` and explicitly
  re-allows `.env.example`; this is a useful safeguard but not proof that a
  secret was never committed.
- Before submission, initialize/use the intended repository, inspect tracked
  files and history for secrets, confirm `.env` is ignored/untracked, and make
  reviewable commits. This audit did not create or alter Git history.

## THREATS.md, README, and deployment accuracy

- [THREATS.md](../THREATS.md) accurately documents the metadata-only account
  scope, temporary-password delivery risk, missing recovery/MFA, session
  revocation gap, audit tamper risk, deployment assumptions, and current
  Prisma advisory. Its control table should be read alongside the test gaps
  above; the rate-limit fail-closed claim has source evidence but no direct
  fail-closed test.
- [README.md](../README.md) accurately documents the local stack, setup,
  bootstrap workflow, live integration command, and absence of real money
  movement. However, its statement that the integration suite verifies
  “rate-limited API operations” overstates test evidence: the test runs through
  the limiter middleware but does not assert threshold enforcement or Redis
  outage behavior.
- [architecture.md](../docs/architecture.md) explicitly says production
  hosting is not configured. No deployment manifest or CI workflow was found.
  HTTPS/proxy trust, secret management, production database role, monitoring,
  backups, and recovery remain deployment work, not implemented features.
- [client/index.html](../client/index.html) still describes the page as a
  “financial dashboard foundation”; this is stale branding/metadata relative
  to the connected authentication/account/admin UI.
- The Vite development server binds to `0.0.0.0` in [client/package.json](../client/package.json).
  Keep that development-only or bind locally; do not treat the dev server as a
  production deployment.

## Prioritized remaining work

### P0 — before submission

1. Create the intended permanent first admin securely and verify its live
   login. The current database has no admin; no user bootstrap credentials
   were configured during this audit.
2. Diagnose the two intermittent 403 live-admin login failures and make a
   repeatable bootstrap → login → admin operations test. Preserve the isolated
   successful login result but do not represent it as a stable full E2E pass.
3. Resolve the Prisma `deepmerge-ts` advisory through a planned, compatibility-
   tested Prisma upgrade. Re-run `npm audit`, schema validation, migrations,
   build, and all tests after changing versions.
4. Compare the submission against the exact ten functional challenge
   requirements. They are unavailable for verification here; do not claim
   complete challenge compliance before mapping them.
5. Establish/verify the intended Git repository and inspect its history for
   secrets. No commit history can currently be reviewed.

### P1 — strong submission quality and security

6. Add tests for rate-limit thresholds and Redis outage fail-closed behavior,
   production cookie flags, password-reset session revocation, audit
   transaction rollback, and last-admin concurrency.
7. Add browser-run admin onboarding/user role-status/password-reset/audit
   journeys and automated responsive/accessibility checks. The browser flow
   verified in this audit covered a holder, not the admin dashboard.
8. Correct the README rate-limit test claim and stale `client/index.html`
   description; add explicit production deployment guidance or state clearly
   that deployment is out of scope.
9. Harden and test malformed request handling, and add before/after details for
   sensitive admin changes if the audit requirement expects them.

### P2 — only if the official brief or intended deployment requires

10. Implement challenge-specified transaction, ledger, budget, or reporting
    features only after verifying their exact wording. The current app has no
    transaction/ledger API or schema and explicitly displays transactions as
    unavailable.
11. Add verified email, recovery, MFA, independent audit retention, backup and
    recovery testing, and production monitoring according to the final threat
    model.

## Audit execution record

- Backend unit/API tests: **passed, 3/3**.
- Live PostgreSQL/Redis integration suite: **passed, 1/1**. The suite seeds a
  temporary test admin directly in the database; it does not test bootstrap.
- First-admin CLI entrypoint with a uniquely generated temporary account:
  **passed**; isolated login to the live API returned HTTP 200 and role ADMIN.
  The test admin and its audit row were removed; configured DB admin count
  returned to zero.
- Holder browser E2E: registration, account create, edit, close, and logout
  **passed**. Database inspection confirmed `auth.register`,
  `account.created`, `account.updated`, `account.closed`, and `auth.logout`;
  the exact test user, account, and associated audit rows were then removed.
  Browser tooling recorded aborted response events during navigation after
  delete/logout; the database-side operations and logout audit were present.
- Expanded live admin flow: **inconclusive** because two attempts returned
  HTTP 403 at login while isolated bootstrap/login probes passed. No cause was
  confirmed.
- `npm audit`: **3 high-severity entries**, all in the single Prisma /
  `deepmerge-ts` dependency chain above.
- Frontend build, Prisma validate/migrate status, production-cookie behavior,
  and deployment start were **not rerun as part of this audit**.
- No source files or Git history were changed. No challenge requirement was
  invented or marked implemented without evidence.
