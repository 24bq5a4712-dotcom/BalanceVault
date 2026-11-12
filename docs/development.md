# Local development

1. Install Node.js 20.19+ or 22.12+ and npm.
2. Start local PostgreSQL and Redis services.
3. Copy `server/.env.example` to `server/.env`, provide local connection URLs,
   and set `SESSION_SECRET` to a generated random value of at least 32 bytes.
   The application intentionally refuses to start with a missing or too-short
   session secret.
4. Run `npm install`, `npm run db:generate`, and `npm run db:migrate`.
5. To create the first administrator, set `BOOTSTRAP_ADMIN_EMAIL` and
   `BOOTSTRAP_ADMIN_PASSWORD` in the process environment and run
   `npm run admin:bootstrap`. Do not put credentials in command history or
   tracked files.
6. Run `npm run dev`.

The service URLs in the example file are placeholders for local development.
Successful startup does not establish that the database and Redis are
connected; call `GET /api/ready` to verify both at runtime.

Run `npm test` for backend HTTP tests using a fake database and in-memory
session store, plus client API error-message tests. Run
`npm run test:integration` only against a disposable or backed-up non-production
database; it creates and cleans up a run-scoped test administrator, holders,
and an account. The React client uses the same-origin Vite `/api` proxy during
development.

## Production deployment readiness

This repository does not configure a hosting provider, reverse proxy, CI/CD
pipeline, production database, or production Redis instance. Do not treat the
development servers as production hosting.

Before deploying:

1. Select the hosting topology and configure HTTPS, the exact browser origin,
   managed secrets, restricted database credentials, Redis access, logging,
   monitoring, and backup/recovery procedures.
2. Set `NODE_ENV=production`, `CLIENT_ORIGIN`, `DATABASE_URL`, `REDIS_URL`, and
   a private `SESSION_SECRET` of at least 32 bytes in the hosting provider's
   secret/configuration system. Never commit `.env` or paste secret values in
   deployment logs.
3. Configure the HTTPS reverse proxy and Express proxy trust deliberately.
   The application currently has no `trust proxy` setting; do not enable broad
   proxy trust without restricting it to the actual trusted proxy hops. Verify
   that production Secure session cookies work through the chosen topology.
4. Take and verify a database backup before applying schema changes. Build and
   run `npm test`, then apply only checked-in migrations with
   `npm run db:deploy` from the selected deployment environment.
5. Start the API with `npm start`, serve the built client using the chosen
   hosting setup, and verify `GET /api/ready` reports PostgreSQL and Redis as
   ready. Do not run `npm run test:integration` against production; it creates
   temporary administrator and user records.

The official challenge event page asked for a public repository and live site,
but no hosting provider is configured here. No public push or deployment has
been performed.
