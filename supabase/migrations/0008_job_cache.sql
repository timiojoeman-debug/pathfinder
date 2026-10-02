-- Cache of early-career postings from employers' public ATS job boards.
--
-- A daily Vercel Cron job (/api/cron/refresh-jobs) reads each employer's public
-- Greenhouse / Lever / Ashby feed and upserts the internship, graduate and
-- placement roles here; /api/jobs/search reads this table first. Fetching on every
-- search would hit ~175 third-party boards per request, and a cache also lets us
-- say a role has closed once it disappears from its board.
--
-- No personal data: every column is a public job-board field.

create table if not exists job_listings (
  id         uuid        primary key default gen_random_uuid(),
  -- Which ATS the row came from: greenhouse | lever | ashby.
  source     text        not null,
  employer   text        not null,
  title      text        not null,
  location   text        not null default '',
  work_mode  text        not null default '',
  -- The posting URL is the identity: the same role re-fetched upserts, not duplicates.
  url        text        not null unique,
  -- When the employer published it, if the feed says. Never guessed.
  posted_at  timestamptz,
  fetched_at timestamptz not null default now(),
  -- false once the role has dropped off its employer's board. Rows are kept rather
  -- than deleted so a saved role can be told "this posting has closed".
  active     boolean     not null default true
);

-- Search reads active rows newest first; the partial index keeps it to those.
create index if not exists job_listings_active_posted_idx
  on job_listings (posted_at desc nulls last) where active;

-- The refresh closes an employer's vanished roles by employer + source.
create index if not exists job_listings_employer_idx on job_listings (source, employer);

-- Written and read server-side with the service-role key, which bypasses RLS.
-- Enabling RLS with no policy denies anon and authenticated outright; there is
-- no reason for a browser to query this table directly.
alter table job_listings enable row level security;
