# Prompt Journal

## Day 9: Express + TypeScript API

### Prompts used

- Implement and verify the Day 9 Express/TypeScript API with Zod validation,
  request logging, centralized errors, Prisma ticket endpoints, Postman
  documentation, and `{ data, error, meta }` responses.
- Follow-up review feedback selected the missing ticket-route access control;
  the requested choice was a shared API key.
- Complete the remaining environment, ticket API, response-envelope, Postman,
  Jest, journal, and Git verification tasks without changing `app.js`, Prisma
  migrations, or database contents.

### Implementation and technical decisions

- The API runs from `src/server.ts`; strict TypeScript mode is enabled. Existing
  `app.js` remains unchanged.
- Environment and request input are validated with Zod. `DATABASE_URL` and
  `API_KEY` are required; `PORT` and `NODE_ENV` have validated defaults.
- Ticket routes use a shared bearer API key because that access control was
  explicitly selected in the earlier feedback. The key is supplied through the
  environment and is not included in source or Postman files.
- Prisma client usage stays in the repository. API validation and service
  logic use domain-owned ticket enums.
- All API success and error responses use `{ data, error, meta }`. Unexpected
  database errors are logged without returning their messages to clients.
- Ticket creation requires the non-nullable ticket fields from the existing
  Prisma schema. Existing status and priority enum values are used. Ticket
  listing defaults to page 1 and 20 items, with a maximum page size of 100.
- Health is a public liveness check and does not query the database.
- No migration, generated Prisma file, or database contents were changed.

### Assumptions

- The database is provisioned and migrated outside the API; starting the API
  must not run a migration, reset, or destructive operation.
- The Compose service's named `postgres_data` volume is persistent. No
  database reset, drop, or seed operation is needed for API verification.
- Ticket create needs an existing `createdById`; optional assignee and SLA
  values may be null.
- A shared API key protects ticket routes but does not identify individual
  users or provide role-based authorization.
- Jest mocks repository methods for isolated service/API error tests, and live
  HTTP verification is performed separately against the configured PostgreSQL
  database.

### Issues encountered and fixes

- Jest initially found no tests because the project had no Jest configuration
  or test files. Added a Jest config and tests using the already installed
  TypeScript/esbuild tooling; no package dependency was added.
- Runtime investigation found TypeScript `.js` import specifiers resolving to
  older JavaScript route/controller/service files with the same names. Changed
  TypeScript imports to explicit `.ts` paths and enabled
  `allowImportingTsExtensions` with `noEmit`, so `tsx` runs the intended
  TypeScript implementation.
- Startup validation now gives clear required-field messages for missing
  `DATABASE_URL` and `API_KEY` without printing their values.
- The existing Compose PostgreSQL container was already running and healthy on
  port 5432. Prisma reported that the existing migration is up to date, so no
  migration command was applied.
- A private 32-byte API key was generated into the Git-ignored
  `apps/api/.env`; its value was never displayed or committed. Added
  `apps/api/.env.example` with placeholders only.
- Malformed JSON is distinguished from unrelated runtime `SyntaxError`s:
  malformed client JSON returns 400, while unexpected errors return a
  sanitized 500.

### Verification results

- `npm.cmd run typecheck` from `apps/api`: passed.
- `npm.cmd test` from `apps/api`: **4 suites passed, 26 tests passed, 0 failed**.
- `npx.cmd prisma migrate status`: one migration found; database schema is up
  to date. No migration was needed or applied.
- Startup validation with both required variables missing and dotenv loading
  disabled: exited with an error naming both required variables; no values
  were printed.
- Live HTTP checks against the TypeScript server and PostgreSQL: health and
  ticket list returned 200; ticket create returned 201; read, update, close,
  and reopen returned 200. Direct SQL confirmed the created ticket persisted
  with the updated priority and final `OPEN` status (test ticket ID 51).
- Live invalid body and ID requests returned 400; a missing ticket returned
  404; a create request with a nonexistent creator foreign key returned a safe
  409. Responses used the standard envelope and request ID.
- API and repository tests cover successful mocked CRUD/list operations,
  missing records, validation errors, conflicts, and sanitized unexpected
  database failures.
- Postman collection parsed successfully and contains 12 requests, including
  health, ticket operations, and error scenarios. No real API key is stored.
- No seed command, database reset, migration, or DELETE request was run. The
  live verification ticket was retained because deletion was not approved.
- `git diff --check` passed. Copied skill bundles are under conventional
  `.agents/skills`, `.claude/skills`, and `.windsurf/skills` directories and
  are listed in `skills-lock.json`; they are not API runtime dependencies but
  may be consumed by the corresponding AI coding tools, so they were preserved.

No environment values, credentials, or real API keys are recorded here.

## Day 13: Frontend foundation and previous-task audit

### Prompts and approved decisions

- Build a React, Vite, TypeScript, Tailwind, TanStack Query, and React Hook
  Form foundation using the existing backend login contract.
- Audit Days 10–12 using repository evidence, preserve uncommitted work, and
  report missing task briefs instead of guessing at permissions or features.
- Investigate the reported mobile login click issue with Playwright geometry
  and hit testing before changing CSS.
- Approved choices: create `apps/web`, add its frontend and test dependencies,
  use `sessionStorage` for the one-hour JWT, and proxy local API requests to
  `http://localhost:3000`.

### Changes made

- Added the React/Vite frontend with strict TypeScript, Tailwind, React Router,
  TanStack Query, React Hook Form, a shared typed API client, login/auth state,
  protected routes, responsive application shell, and focused UI tests.
- The client uses the confirmed `POST /auth/login` request and
  `{ data, error, meta }` response. The token is stored in `sessionStorage`;
  passwords are not stored. No backend authentication or CORS code was
  changed.
- Added `apps/web/.env.example` with the local API base URL. Vite proxies
  `/auth` and `/tickets` to that URL in development.
- Updated the successful-login UI test to verify trimmed email input matches
  the backend's email trimming behavior.
- No layout CSS fix was made: current Playwright geometry does not show
  overlapping controls, so the earlier reported interception was not
  reproduced in the fresh browser page.
- No Day 10–12 backend feature or authorization changes were made because
  authoritative briefs and permission decisions were not available.

### Verification evidence

- `apps/web`: `npm.cmd run typecheck` passed.
- `apps/web`: `npm.cmd test` passed, 2 test files and 11 tests.
- `apps/web`: `npm.cmd run build` passed with Vite 8.3.8.
- `apps/api`: `npm.cmd run typecheck` passed.
- `apps/api`: `npm.cmd test` passed, 4 suites and 29 tests. The Jest suite
  mocks repositories/Prisma; no isolated integration-test suite is configured.
- The web package has no configured lint or format-check script.
- Playwright measured the button at `(40, 579.6)` with size `310.4 × 48` at
  390×844, and `(772.8, 501.6)` with size `358.4 × 48` at 1366×768. At each
  button center, `document.elementFromPoint()` returned the button; the email
  and password controls did not overlap its rectangle. The hit stack contained
  the button and its normal ancestors only.
- Actual browser fill-and-click succeeded at both viewports. The UI then showed
  a safe temporary-unavailable message because the API proxy returned 502
  while the API server was stopped. During an earlier local API run, a dummy
  login request returned a sanitized 500 after a Prisma request error. A
  successful database-backed login could not be verified.
- Saved the full Playwright measurements outside the repository at
  `C:\Users\mruna\.copilot\session-state\b47874b5-24b0-4ae9-9825-6e4a982c4b1f\files\supportdesk-day13-layout-diagnostics.json`.

### Audit findings and pending decisions

- No authoritative Day 10–12 task briefs or Notion exports were found in the
  current checkout. Current documentation describes Day 9 only.
- The API README/env validation mention a shared API key, while current ticket
  routes use JWT authentication. Which contract is intended requires lead
  confirmation. Updated the API README to describe the active JWT route
  behavior; left environment validation and security behavior unchanged.
- The README's old Postman JSON path was absent; current request files are
  under `postman/collections/SupportDesk API/`. Their bearer-token variables
  have different names, so their full JWT workflow remains unverified. Updated
  the README to document the actual location and this verification gap rather
  than claim the collection works.
- Current branch has ticket filtering/pagination but no comment routes or
  OpenAPI docs. Similar work exists on a separate commit/branch, not current
  HEAD. Whether that work is required for Day 11 needs the actual task brief.
- Role middleware exists but is not applied by current routes. The approved
  role/permission matrix is missing; no role policy was invented.
- No Day 12 review/EOD evidence was found. Prior journal test counts are
  historical claims and were not treated as current results.
- The backend's current database-backed login flow is blocked by a Prisma
  error in the local environment. Its root cause has not been determined.
- The mobile click interception remains unconfirmed: current browser evidence
  shows no layout overlap and successful clicks. No CSS fix was justified.

No passwords, JWTs, API keys, or environment values were recorded.
