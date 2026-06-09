# Nourish Backend

This directory contains the backend only. It does not modify or connect to the
existing frontend.

## Architecture

- Fastify provides the versioned HTTP API.
- Supabase provides PostgreSQL, Auth and row-level security.
- PostgreSQL functions perform reservation state changes transactionally.
- Railway runs the API and checks `/health` during deployments.
- Swagger UI is available at `/docs` when the service is running.

The Supabase service-role key is used only by the server for token verification
and health checks. User-scoped operations are executed with the caller's access
token so row-level security remains effective.

## Local Setup

Requirements:

- Node.js 22 or newer
- A Supabase project

Install dependencies:

```bash
cd backend
npm install
cp .env.example .env
```

Set all variables in `.env`. `SUPABASE_SERVICE_ROLE_KEY` must never be exposed
to a browser or committed to Git.

The Supabase CLI is installed locally by `npm install`. Do not depend on a
global `supabase` command.

Find the project reference in the Supabase dashboard under **Project Settings >
General > Reference ID**. It is the generated project identifier, not the
display name. Link and migrate the remote project:

```bash
npm exec supabase -- login
npm exec supabase -- link --project-ref YOUR_PROJECT_REFERENCE_ID
npm run db:push
```

Enable anonymous sign-ins under Supabase Authentication settings. Load
`supabase/seed.sql` once through the Supabase SQL editor if representative
sample data is required.

For a local Supabase database, Docker must be running:

```bash
npm run supabase -- start
npm run db:reset
```

`npm run db:reset` recreates only the local database and loads the seed. Do not
run it as part of the remote deployment sequence.

Create the administrator in Supabase Authentication, copy its user UUID, and
run:

```sql
insert into public.profiles (user_id, role)
values ('ADMIN_AUTH_USER_UUID', 'admin');
```

Start and test:

```bash
npm test
npm run dev
```

## API

Public:

- `GET /`
- `GET /health`
- `GET /api/v1/locations`
- `GET /api/v1/inventory`
- `POST /api/v1/auth/anonymous`
- `POST /api/v1/auth/admin/login`
- `POST /api/v1/auth/refresh`

Authenticated reservation holder:

- `POST /api/v1/reservations`
- `GET /api/v1/reservations/:code`

Administrator:

- `GET /api/v1/admin/inventory`
- `POST /api/v1/admin/inventory`
- `PATCH /api/v1/admin/inventory/:id`
- `DELETE /api/v1/admin/inventory/:id`
- `GET /api/v1/admin/reservations`
- `POST /api/v1/admin/reservations/:id/collect`
- `POST /api/v1/admin/reservations/:id/cancel`

Protected routes require:

```http
Authorization: Bearer SUPABASE_ACCESS_TOKEN
```

The interactive OpenAPI contract at `/docs` contains request validation details.
Errors use:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable message"
  }
}
```

## Reservation Guarantees

`reserve_inventory` locks the inventory row before checking and decrementing
stock. Concurrent requests cannot reduce stock below zero. A reservation
receives a cryptographically random collection code.

Reservations remain held until the administrator marks them collected or
cancelled. Cancellation restores stock; collection does not.

## Railway

Create a Railway service from this repository, set its root directory to
`/backend`, and set the config-as-code file path to
`/backend/railway.json`. Add:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS`
- `LOG_LEVEL=info`
- `TRUST_PROXY=true`

Railway injects `PORT`; do not set it manually. Railpack installs the locked
npm dependencies, starts with `npm start`, and uses `/health` as its
healthcheck.

Use free tiers for development only. Before a public launch, use paid Supabase
and Railway plans so inactivity pauses and development-tier operational limits
do not affect availability.

## Frontend Status

The existing frontend still reads `public/data.json`, uses hard-coded map
locations, and does not call this API. Connecting it is intentionally excluded
from this implementation.
