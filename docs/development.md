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

Run `npm test` for HTTP-level tests using a fake database and in-memory session
store. Run `npm run test:integration` for live PostgreSQL and Redis checks; it
creates and cleans up uniquely named test records. The React client uses the
same-origin Vite `/api` proxy during development.
