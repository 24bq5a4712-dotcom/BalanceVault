# Architecture

```text
Browser
  └── React + Vite client (:5173)
        └── /api requests → Express API (:3000)
                              ├── Prisma → PostgreSQL
                              │             ├── users and accounts
                              │             └── application audit events
                              └── Redis
                                    ├── API/auth rate limits
                                    └── server-side sessions
```

The Vite development server proxies `/api` requests to Express. In production,
serve the built client and API according to the deployment environment; this
scaffold does not prescribe or configure a hosting provider.

`/api/health` is a liveness check. `/api/ready` actively checks PostgreSQL and
Redis and reports a failure if either is unavailable. Health endpoints run
before session and rate-limit middleware so they remain useful when Redis is
unavailable.

All state-changing API routes require a CSRF token from
`GET /api/auth/csrf`. Authentication uses Redis-backed HTTP-only sessions.
User registration creates account holders; administrator access is granted
only by the one-time CLI bootstrap or an authorized administrator.

Account records currently represent account metadata only. Balances initialize
to zero, and this foundation does not implement ledger transactions or money
movement.
