-- Shared rate-limit counters.
--
-- The limiter was an in-memory Map. On Vercel every serverless instance keeps
-- its own copy, so the effective limit was (instances x limit): 11 rapid
-- signups against production produced a single 429 where 1 was configured to
-- allow 10/min total. This table moves the counter somewhere all instances
-- can see.
--
-- Postgres rather than Redis: Supabase is already deployed here, so this needs
-- no new service, account or credential. If write volume ever outgrows it, the
-- callers in lib/rate-limit.ts are a drop-in swap for @upstash/ratelimit.

create table if not exists rate_limit_buckets (
  key        text        primary key,
  count      integer     not null,
  reset_at   timestamptz not null
);

-- Supports the opportunistic sweep of expired rows below.
create index if not exists rate_limit_buckets_reset_at_idx
  on rate_limit_buckets (reset_at);

-- Never exposed to clients: the limiter runs server-side with the service-role
-- key, which bypasses RLS. Enabling it with no policy denies anon/authenticated
-- outright, which is what we want — a student must not be able to read or
-- reset their own counter.
alter table rate_limit_buckets enable row level security;

/**
 * Atomically record one hit against `p_key` and return the resulting count and
 * window expiry.
 *
 * Fixed window: the first hit sets reset_at to now + p_window_ms, and later
 * hits keep that expiry until it passes. The INSERT ... ON CONFLICT takes a
 * row lock, so concurrent requests from different instances cannot interleave
 * a lost update — which is the entire point of moving this out of memory.
 *
 * The daily AI quota uses the same function: the caller passes the milliseconds
 * remaining until the next UTC midnight, so the first call of the day pins
 * reset_at to midnight and every later call inherits it.
 */
create or replace function rate_limit_hit(p_key text, p_window_ms bigint)
returns table (hits integer, reset_at timestamptz)
language plpgsql
as $$
declare
  v_now    timestamptz := now();
  v_window interval    := make_interval(secs => p_window_ms / 1000.0);
  v_count  integer;
  v_reset  timestamptz;
begin
  insert into rate_limit_buckets as b (key, count, reset_at)
  values (p_key, 1, v_now + v_window)
  on conflict (key) do update
    set count    = case when b.reset_at <= v_now then 1 else b.count + 1 end,
        reset_at = case when b.reset_at <= v_now then v_now + v_window else b.reset_at end
  returning b.count, b.reset_at into v_count, v_reset;

  -- Opportunistic cleanup so the table cannot grow without bound. Cheap at 1%
  -- of calls, and expired rows are meaningless once the window has passed.
  if random() < 0.01 then
    delete from rate_limit_buckets where reset_at < v_now - interval '1 hour';
  end if;

  return query select v_count, v_reset;
end;
$$;
