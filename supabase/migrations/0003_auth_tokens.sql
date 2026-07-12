-- Email verification + password reset. Only token *hashes* are stored (the raw
-- token lives in the emailed link), tokens are single-use and time-boxed.
--
-- RLS is enabled with NO policy: these tables are reachable only by the
-- service-role client. Leaving them exposed to the anon key would be an
-- account-takeover risk (anyone could read reset-token hashes).

alter table users add column if not exists email_verified boolean default false;

create table if not exists email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  token_hash varchar(64) not null,
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  token_hash varchar(64) not null,
  expires_at timestamp with time zone not null,
  used boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_email_verif_hash on email_verification_tokens(token_hash);
create index if not exists idx_pw_reset_hash on password_reset_tokens(token_hash);

-- Service-role-only: RLS on, no policy.
alter table email_verification_tokens enable row level security;
alter table password_reset_tokens enable row level security;
