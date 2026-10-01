-- Pilot interest from university career services.
--
-- The "For universities" page had no conversion path at all. Every CTA on it
-- was once a mailto: to partnerships@pathfinder.app, an address that does not
-- exist, so all five buttons were dead ends; they were removed and replaced
-- with a static "Pilot programme not open yet" chip. That was the honest fix
-- and it left the B2B2C surface unable to capture the one thing it exists to
-- capture — a careers director raising their hand.
--
-- A table rather than an inbox for the same reason the rate limiter and the
-- error log are tables: Supabase is already deployed, so this needs no new
-- service, mailbox, credential or third-party form embed, and it is queryable
-- today. Nothing here emails anyone; it records interest so it can be acted on
-- deliberately. Wire notification later if the volume ever justifies it.

create table if not exists pilot_interest (
  id           uuid        primary key default gen_random_uuid(),
  institution  text        not null,
  contact_name text        not null,
  email        text        not null,
  role         text,
  cohort_size  text,
  note         text,
  -- Which page/section the submission came from, so a later change to the page
  -- can be told apart from a change in demand.
  source       text        not null default 'universities',
  created_at   timestamptz not null default now()
);

-- Triage is newest-first; the email index backs duplicate checks, since a
-- careers team that submits twice is one lead, not two.
create index if not exists pilot_interest_created_at_idx on pilot_interest (created_at desc);
create index if not exists pilot_interest_email_idx      on pilot_interest (lower(email));

-- Written server-side with the service-role key, which bypasses RLS. Enabling
-- RLS with no policy denies anon and authenticated outright. That matters more
-- here than on most tables: these rows are named individuals at identifiable
-- institutions who have expressed commercial interest, and the submitting form
-- is public. Nothing client-side may ever read this back.
alter table pilot_interest enable row level security;
