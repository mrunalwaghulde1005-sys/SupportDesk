# SupportDesk API

The TypeScript API runs from `src/server.ts`. `app.js` remains unchanged; the
`start` and `dev` scripts use the TypeScript server.

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

`DATABASE_URL` is required and must be a PostgreSQL URL. `API_KEY` is also
required and must contain at least 32 characters. `PORT` is optional and
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

All `/tickets` endpoints in the active TypeScript app require
`Authorization: Bearer <token>` issued by `/auth/login`. The token is a
one-hour JWT and identifies the authenticated user. `/health` remains public
and does not check the database.

`API_KEY` is still required by the current environment validation, but the
active TypeScript ticket routes use JWT authentication rather than the
API-key middleware. Confirm whether the unused setting should be removed
before changing startup configuration or authentication behavior.

Ticket creation requires `title`, `description`, `status`, `priority`,
`category`, and an existing `createdById`. `assigneeId` and `slaDueAt` are
optional and may be `null`. Status and priority must match the Prisma enums.
Validation rejects unknown fields. Deleting a ticket may be rejected when
related rows prevent deletion.

## Expected status codes

| Scenario | Status | Error code |
|---|---:|---|
| Health or successful read/list/update/close/reopen/delete | 200 | — |
| Ticket created | 201 | — |
| Invalid JSON, ticket fields, filters, or ID format | 400 | `INVALID_JSON` or `VALIDATION_ERROR` |
| Missing or incorrect API key | 401 | `UNAUTHORIZED` |
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
