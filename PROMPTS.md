# BalanceVault implementation guidance

## Fixed stack

- Frontend: React with Vite.
- Backend: Node.js with Express.
- Database and ORM: PostgreSQL with Prisma.
- Rate limiting and session storage: Redis.
- Do not add MongoDB, Firebase, or Next.js.
- Never commit real secrets or credentials.

## Current implementation facts

- The API provides password registration/login, session/CSRF handling, holder/admin authorization, account metadata endpoints, one-time administrator bootstrap, and application audit events.
- The React client supports authentication, account management, temporary-password changes, admin onboarding/access management, password reset, and audit-log views.
- Account balances are read-only. No deposit, withdrawal, transfer, or financial transaction workflow exists.
- Automated API tests use an in-memory fake repository and session store; they do not prove live PostgreSQL or Redis behavior.
- The opt-in `npm run test:integration` tests against local PostgreSQL and Redis. It is not a substitute for production security testing.

## Engineering constraints

- Preserve owner-scoped access and deny-by-default role checks on the server.
- Keep account/admin mutations and corresponding audit events in the same database transaction.
- Never place passwords, hashes, session tokens, or connection strings in logs, responses, or audit metadata.
- Validate PostgreSQL migrations and exercise Redis sessions/rate limiting against real services before claiming those integrations work.
- Update this file when implementation status or stack constraints change.

## Work log

*Note: The entries below are reconstructed task summaries from the existing work log, repository evidence, and verified conversation history. They are not claimed to be verbatim copies of the original AI prompts.*

### 1. 2026-11-11 — CSRF and Origin regression tests
- **Prompt/task summary:** Add backend regression coverage for repeated login attempts with a freshly fetched CSRF token, rejection of a stale pre-login token, and rejection of a disallowed `Origin`.
- **AI output/work:** Added backend regression test coverage using an in-memory holder account and session store.
- **Observed errors and corrections:** No separate error/correction record is available for this task. The tests were intended to verify existing protections, not weaken or bypass them.
- **Commit:** No dedicated verified commit has been identified. Do not invent a commit link; add it only if Git history confirms the relevant commit.

### 2. 2026-11-12 — Login, rate-limit, and CSRF error handling
- **Prompt/task summary:** Diagnose the admin sign-in issue and distinguish invalid credentials (401), rate limits (429), and CSRF/Origin rejections (403), without resetting credentials or weakening security.
- **AI output/work:** Updated frontend error classification so invalid credentials, rate limiting, and CSRF/Origin failures receive distinct messages. Added client regression tests.
- **Observed error and correction:** The client previously described every 401 as an expired session and did not provide a distinct 429 message. The error mapping and tests were corrected.
- **Verification:** Backend tests and client error-mapping tests passed at that stage.
- **Commit:** [97ed04e — fix(auth): distinguish login, throttling, and CSRF errors](https://github.com/24bq5a4712-dotcom/BalanceVault/commit/97ed04e)

### 3. 2026-11-12 — Authorization and admin UI smoke check
- **Prompt/task summary:** Check whether sign-in error states and the admin dashboard render correctly without using real credentials or changing production records.
- **AI output/work:** Browser checks used intercepted API routes and synthetic responses to verify distinct 401, 429, and CSRF 403 messages, and mocked ADMIN dashboard rendering.
- **Observed errors and corrections:** This was a mocked UI check, not a real database login. No production authentication result was inferred from it.
- **Verification limitation:** The check did not prove live admin authorization or a complete browser-based admin workflow.
- **Related commit:** [97ed04e — authentication error handling](https://github.com/24bq5a4712-dotcom/BalanceVault/commit/97ed04e)

### 4. 2026-11-12 — Challenge requirements and audit review
- **Prompt/task summary:** Review available challenge information and document which requirements can and cannot be verified from the supplied brief and repository.
- **AI output/work:** Recorded high-level expectations and kept the ten unavailable functional requirements marked as unavailable rather than inventing acceptance criteria. Documented known implementation and security gaps.
- **Observed errors and corrections:** The public event page did not expose the participant-gated ten-item problem statement. The audit therefore did not claim that those ten requirements were satisfied.
- **Commit:** [e6ddc62 — docs: correct final submission audit history](https://github.com/24bq5a4712-dotcom/BalanceVault/commit/e6ddc62)

### 5. 2026-11-12 — Production session cookie behind Render proxy
- **Prompt/task summary:** Correct production session-cookie behavior when the Express API runs behind Render's reverse proxy.
- **AI output/work:** Updated production proxy/session configuration. The deployed API subsequently started successfully and its health endpoint was reachable through the frontend rewrite.
- **Observed errors and corrections:** The production session-cookie configuration required the correct trusted proxy behavior. The fix was committed and deployed.
- **Commit:** [1a4967f — Fix production session cookies behind Render proxy](https://github.com/24bq5a4712-dotcom/BalanceVault/commit/1a4967f)

### 6. 2026-11-12 — Production user, account, and audit workflow verification
- **Task summary:** Manually verify the deployed admin and holder workflows.
- **Work and observed results:** Admin login/dashboard, user onboarding, holder login, test account creation, editing, and closing were verified in the browser. The admin audit view showed `admin.user.created`, `auth.login`, `auth.password.changed`, `account.created`, `account.updated`, `account.closed`, and `auth.logout`.
- **Limitations:** This verifies metadata/account lifecycle actions only. It does not verify deposits, withdrawals, transfers, or movement of real money.
- **Commit:** No dedicated commit is associated with these manual production checks.

### Latest local verification — 2026-11-12
- `npm test`: backend 6/6 passed and frontend 3/3 passed.
- `npm run build`: successful.
- `git status --short`: clean before the current documentation edit.
- These results are local verification and should not be represented as proof of every production security property.

## Documentation integrity

- Reconstructed summaries are explicitly labelled; they are not verbatim prompt transcripts.
- Do not add fabricated AI outputs, errors, corrections, or commit links.
- If a work-log entry has no verified commit, leave that limitation visible until a real documentation commit is created.
- The ten challenge functional requirements remain unavailable until the exact official wording is obtained.