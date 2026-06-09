# Railway Deployment

Deploy this repository as two Railway services in the same project. The
frontend serves the static files and proxies `/api/*` to the backend, so the
browser never receives Supabase credentials.

## 1. Supabase

The project URL for project reference `gpeshunqrdnijgtnemol` is:

```text
https://gpeshunqrdnijgtnemol.supabase.co
```

In `backend/`, link the project and apply the migrations:

```bash
npm install
npm exec supabase -- login
npm exec supabase -- link --project-ref gpeshunqrdnijgtnemol
npm run db:push
```

Do not run `db:reset` against the hosted project. Enable anonymous sign-ins in
Supabase Authentication because public reservations use anonymous users.

Create the administrator in Supabase Authentication, copy that user's UUID,
then run this in the Supabase SQL editor:

```sql
insert into public.profiles (user_id, role)
values ('THE_REAL_AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

## 2. Backend Service

Create a service from the repository with:

- Root directory: `/backend`
- Railway config file: `/backend/railway.json`
- Public domain: enabled

Set these variables:

```text
SUPABASE_URL=https://gpeshunqrdnijgtnemol.supabase.co
SUPABASE_ANON_KEY=<Supabase publishable or anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role key>
CORS_ORIGINS=https://<frontend-domain>
LOG_LEVEL=info
TRUST_PROXY=true
```

Do not set `PORT`; Railway supplies it. Never add the service-role key to the
frontend service.

After deployment, verify:

```text
https://<backend-domain>/health
```

## 3. Frontend Service

Create a second service from the same repository with:

- Root directory: `/`
- Railway config file: `/railway.frontend.json`
- Public domain: enabled

Set:

```text
BACKEND_URL=https://<backend-domain>
```

The frontend image is built from `Dockerfile.frontend`. Its Caddy server serves
`public/` and `Nourish-Map/`, redirects `/` to the home page, and forwards every
`/api/*` request to `BACKEND_URL`.

After deployment, verify:

```text
https://<frontend-domain>/
https://<frontend-domain>/public/AllItem.html
https://<frontend-domain>/Nourish-Map/map.html
https://<frontend-domain>/api/v1/locations
```

The last URL must return JSON through the frontend proxy. A JSON
`Route was not found` response means the path is wrong or the frontend proxy is
not the service receiving the request.

