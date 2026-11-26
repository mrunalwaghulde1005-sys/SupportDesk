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

## Day 17: AI guardrails

### Objective

Harden the existing Day 16 Gemini categorisation and reply-draft features against
prompt injection, PII disclosure, invalid provider output, unsafe content,
provider failures, and per-user abuse.

### Implementation decisions

- Ticket title, description and comment limits are enforced in backend Zod
  schemas. AI context is also limited and explicitly delimited.
- A reusable PII masker replaces emails, phone-like values, SSNs, card-like
  identifiers, password values and obvious API-key formats before provider use.
- Categorisation and reply prompts keep trusted instructions separate and state
  that ticket/comment content is untrusted and cannot change the task or
  authorize actions.
- Categorisation output uses strict Zod parsing and rejects malformed JSON,
  missing fields, unsupported categories, priorities outside P1-P4 and extra
  fields.
- Reply drafts are buffered, moderated and only then emitted by the SSE
  endpoint. They are never sent or persisted automatically.
- Gemini safety settings add provider-side safety categories; a local moderation
  check provides a fail-safe. Provider safety features are limitations and do
  not replace application business rules.
- Express rate limiting is scoped to authenticated AI routes and keyed by
  `req.user.id`, not IP.
- AI requests use a 15-second controller timeout. Provider, validation,
  moderation, stream and timeout failures return the safe manual fallback
  `AI unavailable — reply manually.` Partial replies are not persisted or
  emitted after interruption.

### Tests and reports

- Added guardrail tests for limits, PII, prompt-injection delimiting,
  moderation, strict Zod output and malformed provider JSON.
- Existing Gemini adapter tests cover provider failures, empty and malformed
  responses, streaming failures and secret-safe logging.
- The lead 10-sample injection dataset and 20-labelled evaluation dataset are
  now located under `apps/api/tests-data/`.
- All 10 lead malicious samples passed provider-independent guardrail tests.
  The real 20-ticket Gemini evaluation was attempted but blocked by HTTP 429
  quota exhaustion on the first request; no measured accuracy is claimed.
- Manual verification remains pending against an authenticated running API.

### Lessons learned

Treat provider output as untrusted data, validate before use, and keep AI
drafts separate from normal ticket mutations. Unit tests must avoid real API
keys and provider credits, while manual evidence must use fake or approved
test credentials.

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

### Day 13: live JWT authentication verification (user-reported, 18 November 2026)

- The user reports logging in through `POST /auth/login` with a registered
  test account and receiving HTTP 200 with a JWT.
- The user reports requesting `GET /tickets` with the JWT in the Bearer
  Authorization header and receiving HTTP 200 with ticket data.
- User-reported result: PASS. This records the user's live verification; the
  agent did not independently repeat the authenticated request. The token and
  account credentials are not included in this journal.
- This later report updates the earlier same-day note that the authorized
  request was still unverified at the time of the agent's own check.
- Ticket ID 58 was retained after verification. No database deletion was
  performed.

### Day 13: remaining-evidence audit after ticket hook refactor (18 November 2026)

#### Journal diff and current implementation

- At the time of this review, the unstaged `docs/prompt-journal.md` diff adds
  the user-reported live JWT verification above (14 content lines). It is not
  only blank lines or a trailing-newline change. The report does not include a
  token or credentials.
- The earlier audit entry saying `features/tickets/hooks/` was absent records
  the state before the refactor. Commit `7a6af81` now adds
  `apps/web/src/features/tickets/hooks/use-tickets.ts` and updates
  `DashboardPage.tsx` to call `useTickets()`. The hook uses query key
  `["tickets"]`, the auth context, `ticketApi.list(session.token)`, an enabled
  guard, and a missing-session safety check. No change to the API contract or
  dashboard states was found in the refactor.
- Read-only review of the committed hook and dashboard found no new defect:
  the hook retains strict typing, has no `any` or non-null assertion, and keeps
  the existing loading, error, retry, empty, and list rendering in the page.
  This source review does not claim browser testing.

#### API-unavailable scenario

- `apps/web/src/App.test.tsx` covers the login page's network-error message by
  mocking the auth request to reject with `ApiClientError("NETWORK_ERROR", ...)`.
  This verifies UI handling of that error object, not a real API outage.
- `apps/web/src/lib/api-client.ts` maps a fetch `TypeError` to `NETWORK_ERROR`,
  but the current tests do not exercise an actual offline browser request or a
  fetch rejection through the shared client. No live outage scenario is
  recorded as passed.
- Manual steps to verify safely: open `/login` in Chrome; open DevTools Network
  and enable the Offline network condition; submit using test-only non-empty
  values with a syntactically valid email; confirm the page displays “Unable to
  reach SupportDesk. Check your connection and try again.”; then disable Offline
  and restore the normal network condition. The Offline condition prevents the
  request from reaching the backend. Do not use real account passwords for this
  check.

#### Browser console, network, design evidence, and review status

- No browser console or Network-panel capture was found, and none was inspected
  during this audit. Source search found no `console.*` calls in the frontend.
  The backend request logger records request ID, method, path, status, and
  duration; the error logger records request ID and error type. Neither logger
  writes request bodies, authorization headers, passwords, or JWT values in
  the inspected code. This is source inspection, not a browser-console test.
- No Day 13 wireframe or standalone implementation-plan artifact was found.
  The Prompt Journal contains planning-prompt summaries and an implementation
  audit, but these do not establish that a wireframe was created.
- The existing read-only review and findings are recorded in the earlier
  “Read-only AI code review” section. Its missing-hooks recommendation is now
  resolved by commit `7a6af81`; no separate code change was needed in this
  audit.
- Git documentation/history contains no Day 13 PR URL or PR number. The current
  branch tracks `origin/feat/web-login-foundation`; the PR merge references in
  the available history are for earlier work and do not establish a Day 13 PR.

#### Remaining manual verification

- iPad Mini responsive layout remains pending; no pass is claimed.
- The real API-unavailable/offline browser scenario remains pending, with steps
  above. Existing mocked UI coverage is not a substitute for that observation.
- Browser console and Network-panel inspection remains pending. No browser test
  evidence is claimed by this audit.

## Day 15: UI quality and role-based comments

### Prompt and implementation decisions

- Prompt received: complete the Day 15 UI quality work after inspecting current
  code, preserve existing uncommitted work, enforce the specified Admin / Agent
  / Customer comment matrix, test the changes, inspect responsive layouts, and
  record actual Lighthouse results without inventing scores.
- Reused `dashboard-ui.tsx` for the existing API-backed status and priority
  badges and content states. Added shared Button, Input, native dialog Modal,
  and responsive semantic table components in `ui-components.tsx`; used them in
  comment controls, ticket creation, ticket deletion confirmation, and Admin
  tables.
- Comment visibility is decided by the API from the authenticated role:
  Admin submissions are stored as INTERNAL; Agent submissions are stored as
  PUBLIC; Customers receive only PUBLIC comments authored by Agents. Admin
  views exclude Admin-authored notes, while assigned Agents can see those
  internal notes. Client-submitted visibility is ignored by the service.
  Customer comment creation is rejected with 403, and authorId is not accepted
  by the request schema.
- No screenshot or wireframe for the Day 15 AI exercise was found in the
  workspace. That screenshot-based exercise remains incomplete; no reference
  comparison or generated design prompt is claimed.

### Verification

- API: Jest 5 suites / 56 tests passed; API TypeScript typecheck passed.
- Web: Vitest 9 files / 56 tests passed; TypeScript typecheck passed; Vite
  production build passed. Vite reported the existing main JS chunk exceeds
  500 kB after minification (520.03 kB); no bundle splitting was done.
- Permission coverage includes Agent/Admin visibility overrides, Customer
  read filtering, Customer POST 403, and author/assignment checks. These API
  tests use mocked repositories; no live Postman request or production API
  permission check was run.
- Responsive viewport checks at 360, 768, and 1280 px were not run. The
  computer-use browser host returned no browser surface, so visual inspection
  could not be performed.
- Lighthouse was not run: the web package has no Lighthouse dependency and
  the computer-use browser host was unavailable. Therefore, no URL-specific
  score or audit result is claimed.
- Source-level accessibility work includes explicit input labels and error
  associations, visible focus styling in shared controls, semantic table
  headers, and a native dialog with Escape handling and browser-managed focus.
  A full browser accessibility/contrast audit remains pending.

### Day 15 remaining-task pass (23 November 2026)

- Inspected the ticket list/detail pages, comment thread, shared UI components,
  API comment route/controller/service/repository/schema, existing API tests, and
  Postman request templates before editing. Preserved the pre-existing working
  tree; no reset, stash, commit, or push was performed.
- Accessibility fixes: Ticket List mobile labels and desktop column labels now
  use `text-slate-600` instead of low-contrast `text-slate-400`. Ticket Detail
  title, category, and description validation errors are rendered inline and
  associated with their controls using `aria-invalid`, `aria-describedby`, and
  alert roles. Admin table headings have `scope="col"`.
- Token-pair contrast calculations: Slate 600 on Slate 50 = 7.24:1; white on
  Indigo 700 = 7.90:1; white on Rose 700 = 6.29:1. These checks cover the
  mentioned interface tokens, not every color combination across the site.
- Responsive source review: ticket rows switch from compact cards to a desktop
  grid at `lg`; the navigation switches from a mobile menu to a desktop sidebar;
  forms use full-width controls; the Admin table uses a horizontal scroll
  wrapper; and the dialog width is bounded to the viewport. Actual 360/768/1280
  browser viewport checks remain pending because the browser access host was
  unavailable and Computer Use review rejected access to Chrome.
- Lighthouse remains pending. The web package has no Lighthouse dependency;
  browser access was unavailable, so no Performance, Accessibility, or Best
  Practices score is claimed.
- Screenshot/wireframe search found no Day 15 reference image. The screenshot
  exercise remains pending.
- Inspected the Admin internal-comment, Agent public-comment, Customer
  read-only, and Customer-forbidden Postman request templates. Computer Use
  review rejected access to Postman, so no collection request was actually run.
  Jest API permission tests use mocked repositories and are not represented as
  live Postman or database integration results.
- Final verification after these source changes: API Jest 5 suites / 56 tests
  passed; web Vitest 9 files / 56 tests passed; API and web typechecks passed;
  web production build passed; `git diff --check` passed. Vite reported a
  520.03 kB minified main JS chunk above its 500 kB advisory threshold.

## Day 16: AI assistance continuation (24 November 2026)

### Scope and implementation decisions

- Continued the existing in-progress Day 16 files without resetting, stashing,
  or replacing them. The tagged `apps/api/prisma/reset-agent-password.ts` file
  was read and left unchanged.
- Kept the backend-only OpenAI Responses HTTP adapter. It sends strict JSON
  schema requests for categorization, disables response storage, maps provider
  failures to sanitized API errors, and requires a completed stream before
  reporting success.
- Mounted the AI assistance UI on Admin and assigned-Agent ticket detail
  pages. Reply output is an editable review draft; it is not posted or saved
  automatically. Applying category/priority suggestions requires an explicit
  button action and uses the existing ticket update endpoints.
- Restricted AI endpoints to Admins and Agents. Existing ticket access checks
  continue to enforce customer ownership and Agent assignment at the service
  boundary.
- Categorization is validated against a strict Zod schema before it is returned.
  Invalid suggestions do not reach the ticket update flow.
- Usage logging reads token counts from the provider response. Cost is an
  estimate only when both actual input/output counts and a configured model
  price are available; otherwise the logged cost is `null`. No live usage,
  token counts, or charges were recorded during this work; provider values in
  automated tests are mocked fixtures only.
- No dependencies were added. The HTTP adapter is a deviation from OpenAI SDK
  integration; adding/approving the SDK remains a release blocker.

### Acceptance checklist from the continuation request

1. **Review backend OpenAI adapter/request-response contracts — PASS.** Mocked
   adapter tests cover endpoint, authorization/content/accept headers, model,
   input/instructions, strict JSON schema format, non-storage option, output,
   usage, malformed response, provider error, and streaming completion.
2. **Suggest Reply backend/frontend streaming — PASS (mocked).** Backend SSE,
   client delta handling, terminal events, failed/incomplete streams, and
   ticket-detail page integration are covered. A live OpenAI request remains
   unverified.
3. **Auto-categorise + Priority with strict Zod validation — PASS.** Valid
   provider output is returned as a suggestion; extra fields and invalid
   values are rejected and are not persisted.
4. **Actual token usage and configured pricing logs — PARTIAL.** Provider
   usage values are parsed and logged without fabricated fallbacks, and costs
   use the configured price map only. Live provider usage and billing were not
   verified; model prices were not independently validated during this run.
5. **Authentication and authorization — PASS (automated).** Tests cover
   unauthenticated and Customer denial, Admin use, and assigned/unassigned
   Agent access.
6. **Mocked-provider unit and integration tests — PASS.** API adapter and
   route/service tests were added without adding dependencies.
7. **Frontend loading, streaming, error, and review states — PASS (automated).**
   Component/API tests cover loading status, split SSE chunks, editable drafts,
   errors, explicit apply actions, and Admin-versus-Agent updates. Manual
   browser/visual verification remains pending.
8. **Typechecks, tests, lint, and builds — PARTIAL.** API and web typechecks,
   full tests, and the web production build passed. Neither package declares a
   lint script; the API package also has no separate build script. Vite emitted
   its existing >500 kB chunk-size advisory.
9. **API-key exposure and direct browser OpenAI requests — PASS (source scan).**
   No OpenAI key or OpenAI API URL was found in the web source. The key is
   consumed only by the API adapter.
10. **Update this journal without removing entries — PASS.** This section was
    appended; previous journal entries were preserved.
11. **Review all Day 16 acceptance criteria individually — PARTIAL.** Every
    numbered priority in this continuation request is listed above. The
    referenced Notion acceptance-criteria page was not available in the
    workspace/tool results, so equivalence to any additional Notion-only
    criteria could not be established.

### Verification evidence and blockers

- API: TypeScript typecheck passed; Jest **6 suites / 69 tests passed**.
- Web: TypeScript typecheck passed; Vitest **12 files / 65 tests passed**;
  production build passed. The generated JavaScript bundle is 527.35 kB
  minified and triggers Vite's 500 kB advisory.
- `git diff --check` passed after the final journal append. New/added files
  also passed a trailing-whitespace scan.
- No live OpenAI request, live billing verification, or manual browser
  interaction was performed. No real API key or production token/cost data is
  recorded here.
- **BLOCKER:** OpenAI SDK integration remains unresolved. The current backend
  uses direct HTTP `fetch`; no SDK dependency was added because lead approval
  is required.
- **PENDING:** Lint and a standalone API build could not be run because the
  package manifests define neither command. The source-level API key scan and
  automated UI tests do not replace manual browser review.

### Day 16: sanitized provider diagnostics follow-up (24 November 2026)

- Added structured OpenAI failure logs with the upstream HTTP status,
  request ID, feature, and only the allow-listed provider `type`, `code`, and
  bounded/sanitized `message` fields. The configured API key and bearer-like
  values are redacted; raw response bodies, request payloads, and headers are
  not logged.
- Fetch and stream-reader failures log only fixed failure classifications and
  safe correlation metadata. Failed streaming events extract the same
  allow-listed fields; malformed/incomplete responses log status without
  response content.
- Threaded the API `X-Request-ID` through both AI routes, provider diagnostics,
  and usage logs. Categorization now records unavailable usage in `finally`,
  including provider failures, so its usage and provider-error records can be
  correlated.
- Client-facing provider errors remain the existing generic messages. Tests
  use mocked fetch/stream responses; no live OpenAI request was made.
- Verification: API typecheck passed; Jest **6 suites / 73 tests passed**.

### Day 16: Gemini provider migration (24 November 2026)

- Replaced the active OpenAI adapter with the official Gemini Developer API
  REST `generateContent` and `streamGenerateContent` endpoints. The API key is
  read only from backend `GEMINI_API_KEY` and sent in the `x-goog-api-key`
  header; it is not placed in the URL, returned to the frontend, or logged.
- Preserved streamed reply drafts and strict categorization: categorization
  requests JSON output constrained by the existing JSON Schema and validates
  the result with the existing Zod schema before returning it. No generated
  reply is posted or saved automatically.
- Set `GEMINI_MODEL`'s default to the stable `gemini-3.5-flash-lite` model.
  The Gemini model page and Standard-tier pricing were checked on 24 November
  2026: input is $0.30 and output (including thinking tokens) is $2.50 per
  million tokens. The adapter maps reported prompt, candidate, thinking, and
  total counts. Where Gemini omits `thoughtsTokenCount`, its value is derived
  only from the actual total/prompt/candidate counts; cost remains null when
  the actual counts needed for an estimate are unavailable.
- Preserved request-ID-correlated, sanitized diagnostics for HTTP, fetch,
  parsing, and stream errors. Logs contain only HTTP status, safe failure
  classification, request ID, and allow-listed sanitized Gemini error fields.
- Updated `apps/api/.env.example` with placeholders and the default model.
  The actual `.env` was not opened or changed. Migrated adapter and route tests
  use mocked Gemini HTTP/SSE responses only.
- Confirmed no active OpenAI-specific configuration, adapter, or test
  references remain in the application source. Earlier journal entries are
  retained as historical records. The former OpenAI SDK blocker is superseded
  by this migration; no provider SDK dependency was added.
- Official references:
  - [Gemini models](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)
  - [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-5-flash-lite)
  - [GenerateContent REST contract](https://ai.google.dev/api/generate-content/generate-content)
  - [StreamGenerateContent REST contract](https://ai.google.dev/api/generate-content/stream-generate-content)
  - [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- Verification: API Jest **6 suites / 73 tests passed**; API TypeScript
  typecheck passed; web Vitest **12 files / 65 tests passed**; web TypeScript
  typecheck passed. No live Gemini calls were made. Manual Postman/browser
  verification remains pending.
