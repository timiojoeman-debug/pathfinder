-- Per-student cache of AI route responses (24h TTL enforced at read time).
--
-- Identical requests to /api/direction/title-variants and
-- /api/interview/company-briefing return the stored response instead of
-- spending another OpenAI call. key_hash is a sha256 of the canonicalised
-- request body (see lib/db/ai-cache.ts).
--
-- PRIVACY: `response` is the student's own AI output, generated from their
-- profile. It is keyed by user_id and deleted with the account: /api/account/delete
-- removes the users row and `on delete cascade` takes this table with it.
-- /api/account/export deliberately skips it: it is derived data, reproducible
-- from inputs the export already contains, not something the student authored.

create table if not exists ai_response_cache (
  user_id    uuid        not null references users(id) on delete cascade,
  route      text        not null,
  key_hash   text        not null,
  response   jsonb       not null,
  created_at timestamptz not null default now(),
  primary key (user_id, route, key_hash)
);

-- Supports cleanup of expired rows.
create index if not exists ai_response_cache_created_at_idx
  on ai_response_cache (created_at);

-- Service-role only: RLS on with no policy denies anon/authenticated, as with
-- rate_limit_buckets. The server scopes every query by user_id.
alter table ai_response_cache enable row level security;
