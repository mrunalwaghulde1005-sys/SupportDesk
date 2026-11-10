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
