# Database — deployment & auth model

## Migrations

`migrations/0001_init.sql` is the full schema (canonical copy also at
`src/lib/supabase/schema.sql`). Apply it to a Supabase project:

```bash
# Option A — Supabase CLI (recommended, versioned)
supabase link --project-ref <your-ref>
supabase db push

# Option B — one-off, paste into the SQL editor
#   copy migrations/0001_init.sql → Supabase dashboard → SQL → Run
```

Then set the env vars from `.env.example`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET`.

New schema changes go in a **new numbered migration** (`0002_*.sql`, …) — never
edit `0001_init.sql` after it has been applied anywhere.

## Authorization model (decided in Phase 0)

PathFinder authenticates with its **own JWT** (`src/lib/auth.ts`), not Supabase
Auth. Consequences you must respect:

- Postgres `auth.uid()` is always `null` for our requests, so the RLS policies
  in the schema (which key on `auth.uid()`) would reject every query.
- Therefore **all server data access goes through the service-role client**
  (`getServerDb()` in `src/lib/supabase/client.ts`), which bypasses RLS.
- **Authorization is enforced in the application layer**: every query in
  `src/lib/db/*` filters by `.eq('user_id', userId)` where `userId` comes from
  the verified JWT (set on `x-user-id` by `middleware.ts`). This scoping is the
  security boundary — a missing `user_id` filter is a data-leak bug.
- RLS stays enabled in the schema as defense-in-depth for any future
  Supabase-Auth surface, but is **not** relied upon by the current app.

If you later migrate to Supabase Auth, switch `getServerDb()` back to an
anon/RLS client and the existing policies take over.

## Local-first fallback

When Supabase env is unset, `getServerDb()` returns `null` and every data helper
degrades to a no-op; the app runs entirely from the client store
(`localStorage`). Auth routes return `503` with a clear message rather than
crashing. This keeps `npm run dev`/`build` working with zero configuration.

## Backups

Enable **Point-in-Time Recovery** in the Supabase dashboard (Database →
Backups) before onboarding real users. CVs and application data are the
irreplaceable user content.
