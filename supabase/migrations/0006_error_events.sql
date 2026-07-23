-- Persistent error tracking.
--
-- Production errors previously existed only as lines in Vercel's log stream:
-- invisible unless someone happened to be tailing them. That is how a silently
-- failing mentor engine went unnoticed for three sessions, and how a
-- rate-limit insert failed for weeks without leaving a trace.
--
-- Postgres rather than Sentry for the same reason the rate limiter uses it:
-- Supabase is already deployed, so this needs no new service, account or
-- credential, and it is queryable today. It deliberately does not replace a
-- real APM — there is no alerting or release tracking here. The
-- `captureException` seam in lib/logger.ts stays, so dropping in
-- @sentry/nextjs later is still a one-file change.

create table if not exists error_events (
  id         uuid        primary key default gen_random_uuid(),
  message    text        not null,
  context    jsonb,
  created_at timestamptz not null default now()
);

-- The two ways this table gets read: newest-first triage, and grouping by
-- message to see which failure dominates.
create index if not exists error_events_created_at_idx on error_events (created_at desc);
create index if not exists error_events_message_idx    on error_events (message);

-- Written server-side with the service-role key, which bypasses RLS. Enabling
-- it with no policy denies anon/authenticated outright: error context can
-- contain user ids and internal detail, so it must never be client-readable.
alter table error_events enable row level security;

/**
 * Record one error. Returns nothing — the caller must never wait on or care
 * about the result, because failing to log an error must not turn into a
 * second error.
 */
create or replace function record_error(p_message text, p_context jsonb)
returns void
language plpgsql
as $$
begin
  insert into error_events (message, context) values (p_message, p_context);

  -- Opportunistic retention. Cheap at 1% of calls, and month-old errors are
  -- noise rather than signal for a project at this stage.
  if random() < 0.01 then
    delete from error_events where created_at < now() - interval '30 days';
  end if;
end;
$$;
