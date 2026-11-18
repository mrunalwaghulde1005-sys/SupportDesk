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

### Day 13: current verification and review (18 November 2026)

#### Task objective and prompts

- Objective: compare the existing Week 3 Day 1 frontend against the supplied
  Day 13 requirements, preserve the committed implementation, close only
  verified coverage gaps, rerun checks, and prepare submission evidence.
- Planning prompt: inspect repository state and map each requirement to source,
  configuration, tests, and documentation before editing; confirm the active
  backend contract from source.
- Implementation prompt: add focused automated coverage only for existing
  required behaviors that were not covered, then record actual verification.
- Read-only review prompt: inspect the final diff and source for architecture,
  strict typing, API configuration, JWT contract, routing, error handling,
  accessibility, responsive behavior, secret exposure, tests, and duplication.
- These are concise descriptions of the current task instructions, not claims
  that the wording reproduces a historical prompt verbatim.

#### Requirement-to-code audit

- The repository is organized as independent `apps/web` and `apps/api` packages;
  there is no root `package.json`.
- Frontend route pages, shared components, `lib`, auth feature, and ticket API
  and components exist. The specifically listed `features/tickets/hooks/`
  directory does not exist; current ticket queries are defined at page level.
- `apps/web/src/lib/api-client.ts` is the only frontend `fetch()` call. It
  centralizes request headers, Bearer token attachment, envelope parsing,
  network/error handling, and unauthorized-session clearing. Dev requests use
  Vite's `/auth` and `/tickets` proxy configured from `VITE_API_BASE_URL`;
  production requests use the configured base URL. The variable is documented
  in `apps/web/.env.example`. No credentials are configured as Vite variables.
- Source confirms `POST /auth/login` and `/auth/register`; login takes `email`
  and `password`, and auth services return `{ user, token }` in the API
  `{ data, error, meta }` envelope. Ticket routes are mounted behind JWT
  `requireAuth`. `API_KEY` remains startup-required but is not used for these
  routes. No backend auth changes were made.
- Session state uses the existing `sessionStorage` implementation, checks token
  expiry client-side, clears on protected-request 401, and signs out locally.
  The server has no logout/revocation endpoint. Local route guards do not
  replace server authorization.
- Login validation, accessible labels, disabled/pending state, safe credential
  and network/server errors, keyboard-operable controls, visible focus styles,
  and responsive layout are present. The app shell includes navigation, header,
  content, and dashboard loading, empty, and retryable error states.
- Installed dependencies include React 19.3.1, Vite 8.3.8, TypeScript 5.9.3,
  Tailwind CSS 4.3.5, TanStack Query 5.107.1, and React Hook Form 7.92.0.
  Existing packages suffice; none were installed or upgraded.

#### Current implementation changes

- Added three focused tests in `apps/web/src/App.test.tsx` for authenticated
  root redirection, the pending-login disabled state (preventing repeat
  submission), and local sign-out/session clearing.
- No production behavior, backend behavior, dependency, environment file,
  README, or wireframe was changed. No wireframe artifact was found.

#### Verification run on 18 November 2026

- `apps/web`: `npm.cmd run typecheck` — passed.
- `apps/web`: `npm.cmd test` — 3 test files passed, 21 tests passed.
- `apps/web`: `npm.cmd run build` — passed; Vite 8.3.8 production bundle built.
- `apps/api`: `npm.cmd run typecheck` — passed.
- `apps/api`: `npm.cmd test` — 4 suites passed, 29 tests passed.
- `git diff --check` — passed after the implementation edit.
- No live backend login or manual browser/mobile test was performed during this
  verification run. Previously documented Playwright layout/click checks and
  the unavailable database-backed login are historical evidence only; they
  are not represented as a current live integration pass. The DB-backed login
  remains blocked by the previously observed Prisma request error; credentials
  and backend availability were not established for this run.

#### Read-only AI code review

- Confirmed defects: none found in the final source diff. The only source diff
  is automated coverage; production auth, route, API, and UI code is unchanged.
- Recommendations / partial requirement: `apps/web/src/features/tickets/hooks/`
  is absent while the requested example structure names it. Current code does
  not need a ticket hook layer for its existing small query surface, so no empty
  directory or unnecessary abstraction was added. Add hooks if the feature
  scope grows or the structure is mandatory for grading.
- Recommendation: add explicit loading and repeated-submit assertions to the
  registration form if registration is later included in the graded scope;
  Day 13's login-specific behavior is covered here.
- Blockers: live valid/invalid backend login, protected endpoint, and browser
  refresh against a running backend remain unverified without a known-good
  local DB/test account. Manual mobile viewport verification was not rerun.
- Learning outcomes: verify behavior from the active source contract; keep
  client-side expiry handling separate from server JWT verification; and add
  focused regression tests for navigation and pending-state behavior.

#### Submission state

- Working branch: `feat/web-login-foundation`; base commit before edits:
  `8bf9b41`. No commit or push was made.
- Suggested commit: `test(web): cover auth redirects and pending login`
- Suggested PR title: `Complete Day 13 frontend foundation verification`
- PR description: `Add focused auth navigation, pending-login, and sign-out
  coverage; verify the existing frontend/backend contract and rerun web and API
  checks. Live database-backed login and mobile verification remain open.`

### Day 13: live verification follow-up (18 November 2026)

- The browser-control host reported that it could not determine the current
  Chrome tab URL with sufficient confidence and stopped browser interaction.
  Therefore no current browser login-page, form-validation, authenticated
  navigation, session refresh, sign-out, or viewport result was observed in
  this follow-up. No browser result is claimed here.
- The running API's `GET /health` returned HTTP 200 with `data.status` equal to
  `ok`.
- The running API's `GET /tickets` without an Authorization header returned
  HTTP 401 with error code `UNAUTHORIZED` and message `Authentication is
  required.` No credentials or token were sent.
- The authorized ticket request and live valid/invalid login attempts were not
  made: the browser session could not be inspected and no approved test account
  or token was available in the observed context. These checks remain BLOCKED.
- The ticket feature has one current dashboard query call
  (`apps/web/src/pages/DashboardPage.tsx`, `useQuery` around line 18) and no
  second consumer. No reusable ticket hook was extracted because that would
  add an abstraction without current reuse. The example `hooks/` directory is
  therefore not implemented; whether its presence is a grading requirement
  remains a structural partial item.
- No application source, server, credentials, or dependencies were changed.
  No server was restarted or stopped. Browser responsive behavior at
  375x812, 390x844, 768x1024, and 1366x768 remains unverified.

### Day 13: Manual testing (user-reported, Chrome Browser DevTools)

The following are the user's manual observations. They were not independently
performed or observed by VS Code Agent, and are separate from the automated
frontend tests and backend HTTP checks recorded above.

#### Responsive UI

- iPhone 16 view: login page layout appeared proper — user-reported PASS.
- Pixel 9 view: login page layout appeared proper — user-reported PASS.
- Desktop responsive view: login page appeared proper — user-reported PASS.
- iPad Mini: no confirming result was provided; status remains unverified.
- Exact viewport dimensions, browser/version details, screenshots, and device
  settings were not provided.

#### Login form validation

- Empty email and password fields: validation message displayed — user-reported
  PASS.
- Invalid email format: validation message displayed — user-reported PASS.
- Invalid credentials: login error message displayed — user-reported PASS.

#### Authentication and navigation

The user reports the following manual results as PASS:

- Accessing `/app` without authentication redirected to `/login`.
- Refreshing the login page worked.
- Successful login worked and authenticated navigation to `/app` worked.
- Refreshing the authenticated session worked.
- Logout worked.

These observations are user-reported and do not establish an independently
verified API response or protected-backend request. The authorized `GET
/tickets` request using a valid JWT remains unverified. The separate backend
check without a JWT is recorded above as HTTP 401 `UNAUTHORIZED`.
