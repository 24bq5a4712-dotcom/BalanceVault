# BalanceVault implementation guidance

## Fixed stack

- Frontend: React with Vite.
- Backend: Node.js with Express.
- Database and ORM: PostgreSQL with Prisma.
- Rate limiting and session storage: Redis.
- Do not add MongoDB, Firebase, or Next.js.
- Never commit real secrets or credentials.

## Current implementation facts

- The API provides password registration/login, session/CSRF handling,
  holder/admin authorization, account metadata endpoints, a one-time
  administrator bootstrap command, and application audit events.
- The React client is connected to user authentication, account management,
  temporary-password changes, admin onboarding/access management, password
  reset, and audit-log views.
- Automated API tests use an in-memory fake repository and session store; they
  do not prove live PostgreSQL or Redis behavior.
- The opt-in `npm run test:integration` verifies API behavior against local
  PostgreSQL and Redis; it is not a substitute for production integration or
  security testing.
- Account balances cannot be mutated and no financial transaction workflow
  exists.

## Engineering constraints

- Preserve owner-scoped access and deny-by-default role checks on the server.
- Keep account/admin mutations and corresponding audit events in the same
  database transaction.
- Never place passwords, hashes, session tokens, or connection strings in logs,
  responses, or audit metadata.
- Validate PostgreSQL migrations and exercise Redis sessions/rate limiting
  against real local services before claiming those integrations work.
- Update this file when implementation status or stack constraints change.

## Work log

- 2026-11-11: Added backend regression coverage for repeated login attempts
  using a freshly fetched CSRF token, rejection of a stale pre-login token,
  and rejection of a disallowed `Origin`. The tests use an in-memory holder
  account and do not create an administrator or change CSRF protections.
