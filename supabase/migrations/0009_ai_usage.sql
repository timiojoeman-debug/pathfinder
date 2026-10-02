-- OpenAI cost log: one row per call, model + token counts only.
--
-- Written server-side (lib/db/ai-usage.ts) from the response's `usage` field.
-- Deliberately NO prompt or response text: this table answers "what does the
-- AI cost, per route and per model", and storing content would turn a cost log
-- into a second copy of every CV a student pasted.

create table if not exists ai_usage (
  id            uuid        primary key default gen_random_uuid(),
  -- Null for guest/unknown callers and after account deletion: the cost
  -- history outlives the user, so set null rather than cascade.
  user_id       uuid        references users(id) on delete set null,
  route         text        not null default 'unknown',
  model         text        not null,
  input_tokens  integer     not null default 0,
  output_tokens integer     not null default 0,
  ts            timestamptz not null default now()
);

create index if not exists ai_usage_ts_idx      on ai_usage (ts desc);
create index if not exists ai_usage_user_id_idx on ai_usage (user_id);

-- Service-role only: enabling RLS with no policy denies anon/authenticated.
alter table ai_usage enable row level security;

/**
 * Admin aggregate: token sums per UTC day, model and route, newest first.
 * Callable only by service_role (revoked from public, anon, authenticated).
 */
create or replace function ai_usage_daily(p_days integer default 30)
returns table (
  day           date,
  model         text,
  route         text,
  calls         bigint,
  input_tokens  bigint,
  output_tokens bigint
)
language sql
stable
as $$
  select (u.ts at time zone 'utc')::date as day,
         u.model,
         u.route,
         count(*)                as calls,
         sum(u.input_tokens)::bigint  as input_tokens,
         sum(u.output_tokens)::bigint as output_tokens
  from ai_usage u
  where u.ts >= now() - make_interval(days => p_days)
  group by 1, 2, 3
  order by 1 desc, 2, 3;
$$;

revoke all on function ai_usage_daily(integer) from public, anon, authenticated;
grant execute on function ai_usage_daily(integer) to service_role;
