# SupportDesk

The TypeScript API runs from `src/server.ts`. `app.js` remains unchanged; the
`start` and `dev` scripts use the TypeScript server. After the web production
build exists, Express serves it from the same port as the API. API calls use
same-origin relative URLs, so no production `VITE_API_BASE_URL` is needed.

## Run

From `apps/api`:

```powershell
npm run typecheck
npm start
```

For local configuration, copy `.env.example` to `.env`, set `DATABASE_URL`
and generate a private `API_KEY` of at least 32 characters. The `.env` file
is ignored by Git; do not commit real credentials. When using Docker Compose
from the repository root, copy the root `.env.example` to the root `.env` and
use matching PostgreSQL values in `DATABASE_URL`.

For development with reload:

```powershell
npm run dev
```

From `apps/web`, run the Vite frontend for normal development:

```powershell
npm run dev
```

Vite listens on all interfaces for device testing and proxies `/auth`,
`/tickets`, `/api/admin`, and `/health` to `http://localhost:3000`. Forward port `5173` for
Vite development, or open its local URL on the PC. The backend still runs on
port `3000` during this two-process development setup.

## Single-port production server

From the repository root, build the frontend and start Express:

```powershell
Push-Location apps/web
npm run build
Pop-Location
Push-Location apps/api
npm start
Pop-Location
```

Express serves the built frontend and `/auth`, `/tickets`, and `/health` on
port `3000` (or the configured `PORT`). In VS Code, forward port `3000`, then
open the forwarded URL and add `/login` on mobile. For example, use
`https://<forwarded-3000-host>/login` with the actual URL shown in the Ports
panel. Refreshing a React Router page such as `/app/tickets` returns the web
application; unknown API paths and API errors remain JSON.

To check login and an authenticated ticket request from PowerShell without
putting a password or JWT in command history, enter the account details
securely when prompted:

```powershell
$baseUrl = 'http://localhost:3000'
$email = Read-Host 'Account email'
$password = Read-Host 'Account password' -AsSecureString
$plainPassword = [System.Net.NetworkCredential]::new('', $password).Password
$body = @{ email = $email; password = $plainPassword } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/login" -ContentType 'application/json' -Body $body
$ticketResponse = Invoke-RestMethod -Uri "$baseUrl/tickets" -Headers @{ Authorization = "Bearer $($login.data.token)" }
"Login succeeded; returned $($ticketResponse.data.Count) tickets."
Remove-Variable plainPassword, body, login, ticketResponse, password
```

`DATABASE_URL` is required and must be a PostgreSQL URL. `JWT_SECRET` is
required and must contain at least 32 characters. `API_KEY` is also required
by startup environment validation and must contain at least 32 characters, but
it is not used by the active TypeScript ticket routes. `PORT` is optional and
defaults to `3000`. The API validates these values at startup. The database
must already be running and migrated; the API does not run migrations or reset
data.

## API responses

Successful responses use `{ "data": ..., "error": null, "meta": ... }`. Errors
use `{ "data": null, "error": { "code": "...", "message": "...", "details": [] }, "meta": ... }`;
`details` is included for request validation errors. `meta` includes a request
ID and response timestamp; ticket-list responses also include pagination
values. Each request receives an `X-Request-ID` header and a log line that
excludes request bodies and credentials.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/tickets?page=1&limit=20&status=OPEN&priority=P1` | List/filter tickets |
| POST | `/tickets` | Create a ticket |
| GET | `/tickets/:id` | Read a ticket |
| PUT/PATCH | `/tickets/:id` | Update ticket fields |
| DELETE | `/tickets/:id` | Delete a ticket |
| PATCH | `/tickets/:id/close` | Set status to `CLOSED` |
| PATCH | `/tickets/:id/reopen` | Set status to `OPEN` |
| GET | `/api/admin/tickets?page=1&limit=100` | Admin-only ticket list across the system |
| PATCH | `/api/admin/tickets/:id` | Admin-only ticket field updates, including status |
| PATCH | `/api/admin/tickets/:id/assignment` | Admin-only assignment to an agent or unassign with `null` |
| GET | `/api/admin/users?role=CUSTOMER` | Admin-only customer list |
| GET | `/api/admin/users?role=AGENT` | Admin-only agent list |

All `/tickets` endpoints in the active TypeScript app require
`Authorization: Bearer <JWT>`. The mounted `requireAuth` middleware verifies
the JWT using `JWT_SECRET`; login and registration issue one-hour JWTs that
identify the authenticated user. `API_KEY` remains required by startup
environment validation, but it is not used by the active TypeScript ticket
routes. `/health` remains public and does not check the database.

Customers can access only tickets they created. Customer tickets start as
`OPEN`; the customer interface displays status as read-only, and the backend
rejects customer status changes through ticket updates, close, or reopen actions.
Agents can list, read, and update status or priority only for tickets assigned to their user ID; they
cannot delete tickets or access `/api/admin` endpoints. Admin endpoints require
an authenticated database user with role `ADMIN`. Ticket assignment accepts an
existing `AGENT` ID or `null` to unassign; the backend rejects assignments to
customers, admins, and unknown users. Customer and agent management currently
lists account records only because the database model has no account disable,
delete, invitation, or lifecycle fields/workflows.

### Provision the first Admin account

Public registration always creates a `CUSTOMER`. The one-time operator command
below creates an Admin only if there is no Admin account and the requested
email is not already used. It hashes the password with the existing bcrypt
service, never changes an existing account, and does not display a password or
token. It does not migrate, reset, or delete data. The command has deliberately
not been run against this project's database.

From `apps/api`, open PowerShell and set a display name and email, then enter
the password through a hidden secure prompt. This converts the secure prompt
value to a process environment variable only for the duration of the command;
it does not put the password in shell history or command-line arguments:

```powershell
$env:ADMIN_NAME = Read-Host 'Admin display name'
$env:ADMIN_EMAIL = Read-Host 'Admin email'
$securePassword = Read-Host 'Admin password (12+ characters)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm.cmd run admin:provision
}
finally {
  Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Variable securePassword, passwordPointer -ErrorAction SilentlyContinue
}
```

Run this only against the intended, already-migrated database after confirming
`DATABASE_URL` in the ignored local `.env`. Passwords must be at least 12
characters and at most 72 UTF-8 bytes. Only the first Admin can be provisioned
using this command; any existing Admin or existing user with that email causes
a safe conflict and leaves the account unchanged. It is not a command for
adding or resetting later administrators.

Ticket creation requires `title`, `description`, `priority`, and `category`;
`status` defaults to `OPEN`, and `createdById` always comes from the verified
session rather than the request. Customers may not set `assigneeId` during
creation. Status and priority must match the Prisma enums. Validation rejects
unknown fields. Deleting a ticket may be rejected when related rows prevent
deletion.

## Expected status codes

| Scenario | Status | Error code |
|---|---:|---|
| Health or successful read/list/update/close/reopen/delete | 200 | — |
| Ticket created | 201 | — |
| Invalid JSON, ticket fields, filters, or ID format | 400 | `INVALID_JSON` or `VALIDATION_ERROR` |
| Missing, invalid, or expired JWT Bearer token | 401 | `UNAUTHORIZED` |
| Authenticated role or ticket scope is insufficient | 403 | `FORBIDDEN` |
| Ticket does not exist | 404 | `TICKET_NOT_FOUND` |
| Related-record or unique-value conflict | 409 | `RELATED_RECORD_CONFLICT` or `CONFLICT` |
| Unexpected database/server failure | 500 | `INTERNAL_SERVER_ERROR` |

Every response uses the `{ data, error, meta }` envelope. Errors set `data` to
`null`; validation failures may include `error.details`. Internal database
messages are not returned to clients.

## Postman

The current request files are under `postman/collections/SupportDesk API/`.
The previously documented JSON collection file is not present in this
checkout. Ticket requests use several different bearer-token variable names
(`api_key`, `access_token`, and `json_web_token_1cqp`); validate those
requests against the active JWT authentication flow before relying on them as
API demonstration evidence. Do not store real credentials or tokens in
Postman files committed to source control.

The API tests do not alter schema or migration files. No database migration is
run automatically.
