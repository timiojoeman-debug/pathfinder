-- PathFinder Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector
create extension if not exists vector;

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique not null,
  password_hash varchar(255) not null,
  role varchar(20) default 'student' check (role in ('student', 'advisor', 'admin')),
  university_id uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Profiles table
create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  direction_statement text,
  direction_score integer,
  career_preferences jsonb default '{}',
  visa_required boolean default false,
  user_phase varchar(30) default 'new' check (user_phase in ('new', 'direction_set', 'cv_uploaded', 'cv_analyzed', 'applying', 'networking', 'interviewing')),
  cv_analysis_history jsonb default '[]',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- CVs table
create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  file_url varchar(500),
  parsed_data jsonb default '{}',
  analysis_results jsonb default '{}',
  is_master boolean default false,
  version_tag varchar(100),
  created_at timestamp with time zone default now()
);

-- Applications table
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  company varchar(255) not null,
  role varchar(255) not null,
  job_url varchar(500),
  status varchar(30) default 'researching' check (status in ('researching', 'tailoring', 'applied', 'networking', 'interviewing', 'offer', 'rejected', 'ghosted')),
  match_score integer,
  ats_keywords jsonb default '[]',
  applied_date date,
  rejection_timing varchar(50),
  notes text,
  next_action varchar(255),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Networking contacts table
create table if not exists networking_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  application_id uuid references applications(id) on delete set null,
  name varchar(255) not null,
  company varchar(255),
  role varchar(255),
  contact_type varchar(30) check (contact_type in ('recruiter', 'hiring_manager', 'peer')),
  linkedin_url varchar(500),
  email varchar(255),
  shared_attributes jsonb default '[]',
  message_text text,
  outreach_variant varchar(50),
  follow_up_step integer default 0,
  follow_up_due date,
  notes text,
  created_at timestamp with time zone default now()
);

-- Coffee chat notes table
create table if not exists coffee_chat_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references networking_contacts(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,
  prep_questions jsonb default '[]',
  key_takeaways text,
  action_items jsonb default '[]',
  referral_status varchar(30) default 'not_asked' check (referral_status in ('not_asked', 'asked', 'pending', 'received', 'declined')),
  chat_date date,
  created_at timestamp with time zone default now()
);

-- Interview stories (STAR)
create table if not exists interview_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  category varchar(50) check (category in ('challenge', 'teamwork', 'leadership', 'failure', 'time_pressure')),
  situation text,
  task text,
  action text,
  result text,
  mapped_questions jsonb default '[]',
  created_at timestamp with time zone default now()
);

-- LeetCode progress
create table if not exists leetcode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  problem_name varchar(255) not null,
  pattern varchar(100),
  status varchar(30) default 'not_started' check (status in ('not_started', 'attempted', 'solved', 'needs_review')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Interview logs
create table if not exists interview_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  application_id uuid references applications(id) on delete set null,
  interview_type varchar(50),
  questions_asked text,
  self_ratings jsonb default '{}',
  went_well text,
  would_change text,
  ai_feedback jsonb default '{}',
  follow_up_email text,
  created_at timestamp with time zone default now()
);

-- AI interactions log
create table if not exists ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  feature varchar(100) not null,
  input_quality varchar(30),
  methodology_applied varchar(100),
  score integer,
  input_summary text,
  output_summary text,
  feedback_items_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Methodology chunks for RAG
create table if not exists methodology_chunks (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  framework_name varchar(100) not null,
  topic varchar(100),
  chunk_text text not null,
  embedding vector(1536),
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_applications_user on applications(user_id);
create index if not exists idx_applications_status on applications(user_id, status);
create index if not exists idx_networking_user on networking_contacts(user_id);
create index if not exists idx_coffee_chat_user on coffee_chat_notes(user_id);
create index if not exists idx_stories_user on interview_stories(user_id);
create index if not exists idx_leetcode_user on leetcode_progress(user_id);
create index if not exists idx_interview_logs_user on interview_logs(user_id);
create index if not exists idx_ai_interactions_user on ai_interactions(user_id);
create index if not exists idx_methodology_embedding on methodology_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 20);

-- Row Level Security
alter table users enable row level security;
alter table profiles enable row level security;
alter table cvs enable row level security;
alter table applications enable row level security;
alter table networking_contacts enable row level security;
alter table coffee_chat_notes enable row level security;
alter table interview_stories enable row level security;
alter table leetcode_progress enable row level security;
alter table interview_logs enable row level security;
alter table ai_interactions enable row level security;

-- RLS Policies (students see only their own data)
create policy "users_own_data" on users for all using (id = auth.uid());
create policy "profiles_own_data" on profiles for all using (user_id = auth.uid());
create policy "cvs_own_data" on cvs for all using (user_id = auth.uid());
create policy "applications_own_data" on applications for all using (user_id = auth.uid());
create policy "contacts_own_data" on networking_contacts for all using (user_id = auth.uid());
create policy "chats_own_data" on coffee_chat_notes for all using (user_id = auth.uid());
create policy "stories_own_data" on interview_stories for all using (user_id = auth.uid());
create policy "leetcode_own_data" on leetcode_progress for all using (user_id = auth.uid());
create policy "interview_logs_own_data" on interview_logs for all using (user_id = auth.uid());
create policy "ai_interactions_own_data" on ai_interactions for all using (user_id = auth.uid());
-- methodology_chunks is public read
create policy "methodology_public_read" on methodology_chunks for select using (true);

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger applications_updated_at before update on applications for each row execute function update_updated_at();
create trigger leetcode_updated_at before update on leetcode_progress for each row execute function update_updated_at();
