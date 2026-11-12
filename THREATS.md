# BalanceVault threat model

## Current scope

This workspace implements Express API foundations for password registration
and login, Redis-backed server sessions and rate limiting, role-based access,
account metadata, an initial administrator workflow, and application audit
events. The React dashboard is connected for registration/login, password
change, account metadata, admin user management, temporary-password reset, and
audit review. No real financial transactions, bank integrations, or balance
updates are implemented.

The checks in `server/test/` use fake persistence and an in-memory session
store. The separate `server/test/integration.live.js` test exercises local
PostgreSQL and Redis, but this is not a production security or reliability
assessment.

## Assets and boundaries

- User credentials, session cookies, account metadata, and audit records.
- `DATABASE_URL`, `REDIS_URL`, and `SESSION_SECRET`.
- Browser-to-API requests and the API's PostgreSQL and Redis connections.

## Implemented mitigations

| Threat | Current control |
| --- | --- |
| Password disclosure | Passwords are hashed with bcrypt; password hashes are omitted from API responses and audit metadata. |
| Session theft/fixation | Server-side Redis sessions, session ID regeneration on login/registration, HTTP-only SameSite=Lax cookies, and Secure cookies in production. |
| Cross-site request forgery | Random session CSRF tokens required for mutations; mismatched supplied Origin values are rejected. The client distinguishes CSRF/origin rejections from invalid credentials and rate limits. |
| Unauthenticated or unauthorized access | Session authentication and server-side role checks protect account/admin APIs; users can only address their own accounts. |
| Role escalation at registration | Self-registration always creates `HOLDER`; admin routes are separately guarded. |
| Brute-force/API abuse | Redis-backed shared API limit plus a stricter auth-route limit; protected routes fail closed if Redis cannot enforce limits. |
| Unauthorized admin creation | One-time CLI bootstrap refuses to run once any admin exists; bootstrap itself is audited. |
| Untraceable application operations | Account changes, admin user changes, password actions, bootstrap, and auth events write audit entries; account/admin mutations and their audit records share a database transaction. |
| Unsafe HTTP defaults | Helmet, JSON body size limit, exact configured CORS origin, and generic internal error responses. |

## Important remaining risks

- Audit events are append-only through the exposed API, but the application does
  not make the database records tamper-proof. Database administrators can
  change them; production needs restricted database roles, retention, and
  independent backup/monitoring controls.
- The temporary-password onboarding flow has no secure delivery channel or
  expiration. Operators must deliver the password out-of-band and should add an
  invitation/reset-token flow before real users are onboarded.
- There is no email verification, self-service recovery, MFA, or session
  revocation management. Password reset forces a password change on subsequent
  protected operations but does not revoke every existing session.
- The client reports login `401`, rate-limit `429`, and CSRF/origin `403`
  responses separately. The previously observed admin-login `403` was not
  captured with its request Origin or CSRF state, so its exact cause is
  unverified. The CSRF middleware runs before the rate limiters; a 403 is not
  evidence of throttling.
- Redis-backed limiters are configured to fail closed, but automated tests do
  not yet verify threshold enforcement or behavior during a Redis outage.
- Account records are metadata only. Balances are initialized to zero and
  cannot be updated through the API. Financial transaction processing,
  reconciliation, and ledger invariants are not implemented.
- CSRF/session security depends on deploying HTTPS in production and keeping
  the exact client origin and session secret private. No proxy trust policy is
  configured.
- Readiness and schema validation are not proof of production availability.
  Configure PostgreSQL/Redis, apply migrations, and test backups, recovery,
  monitoring, and failure handling in the target environment.
- The current `npm audit` reports three high-severity findings in one Prisma
  CLI dependency chain: `deepmerge-ts` below 8.0.0, inherited by
  `@prisma/config` and `prisma`. Prisma 6.19.3 pins `deepmerge-ts` 7.1.5, and
  the non-forced audit fix proposes no compatible updates. Prisma 7.10.1 uses
  the patched dependency but is a major upgrade; plan and validate its
  configuration/runtime migration before adopting it. Do not force that
  upgrade or apply an unverified dependency override.

Do not use this scaffold with real financial data until those risks, security
review, and production operational controls have been addressed.
