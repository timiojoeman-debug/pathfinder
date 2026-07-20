# CLAUDE.md

## Project Overview

PathFinder is an AI-powered internship navigation platform for university students. It guides users through 6 phases: career direction, CV optimization, job discovery, networking, interview prep, and application tracking.

## Tech Stack

- **Framework**: Next.js 16.1.6, React 19.2.3, TypeScript 5
- **Styling**: Tailwind CSS 4
- **State**: Zustand 5 (app-store.ts, auth-store.ts) + localStorage fallback
- **Database**: Supabase PostgreSQL with pgvector (schema in src/lib/supabase/schema.sql, not yet deployed)
- **AI**: OpenAI GPT-4o via direct fetch (src/lib/ai/mentor-engine.ts), text-embedding-3-small for RAG
- **Auth**: Custom JWT (jose) + PBKDF2 password hashing (src/lib/auth.ts)
- **File parsing**: pdf-parse (PDF), mammoth (DOCX)
- **3D**: React Three Fiber + Three.js (dashboard visuals)
- **Testing**: Vitest 4 + Testing Library
- **Validation**: Zod 4

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run tests (vitest watch)
npm run test:run     # Run tests once
npm run lint         # ESLint
```

## Architecture

### API Routes (src/app/api/)

All routes are Next.js Route Handlers (POST unless noted). Auth routes handle JWT cookies. AI routes call OpenAI and return structured JSON with graceful fallbacks when the API key is missing.

- `/auth/{signup,login,logout,me}` — JWT-based auth with httpOnly cookies
- `/direction/{route,explore,title-variants}` — Career direction wizard
- `/cv/{analyze,ats-audit,match,projects}` — CV upload, parsing, AI analysis
- `/jobs/{search,analyze}` — Job search (Adzuna/JSearch APIs)
- `/networking/{outreach,analyze-profile}` — AI-generated outreach messages
- `/network/{coffee-chat-prep,follow-up,referral-package,startup-outreach}` — Networking prep
- `/interview/{questions,company-briefing,feedback,star-builder,star-tweak,rate-solution,random-problem}` — Interview prep
- `/cover-letter/generate` — Cover letter generation
- `/project-builder/generate` — Skill-gap project ideas
- `/analytics/dashboard` — Usage analytics
- `/linkedin/check` — LinkedIn profile analysis
- `/health` — Health check (GET)

### Core Libraries (src/lib/)

- `ai/mentor-engine.ts` — Central AI orchestration: builds UserContext from DB, selects methodology (static vs RAG), calls OpenAI
- `ai/retrieval.ts` — RAG pipeline: embeds methodology chunks via pgvector, retrieves relevant context
- `ai/naturalness-check.ts` — Rule-based AI-written text detector
- `auth.ts` — JWT creation/verification, PBKDF2 password hashing, cookie management
- `supabase/client.ts` — Supabase client (anon for client, service-role for server)
- `supabase/schema.sql` — Full DDL with 11 tables, RLS policies, pgvector indexes
- `db/*.ts` — Typed data access layer (profiles, cvs, applications, contacts, stories, interviews, interactions)
- `prompts/*.ts` — AI prompt builders per feature
- `methodology/*.ts` — Career frameworks (Four Pillars, CV Blueprint, Coffee Chat, Networking, Interview Prep)
- `stores/*.ts` — Zustand stores (app-store, auth-store)

### Frontend Pages (src/app/)

- `page.tsx` — Marketing landing page with 3D hero
- `dashboard/page.tsx` — Main dashboard with phase pipeline
- `direction/page.tsx` — Phase 1: wizard + explore modes
- `cv/page.tsx` — Phase 2: CV upload and analysis
- `jobs/page.tsx` — Phase 3: job discovery
- `networking/page.tsx` — Phase 4: outreach tools
- `interview/page.tsx` — Phase 5: interview prep + LeetCode tracker
- `tracker/page.tsx` — Phase 6: application kanban

## Database

Schema is defined in `src/lib/supabase/schema.sql` but not yet deployed. Currently using localStorage fallback. Tables: users, profiles, cvs, applications, networking_contacts, coffee_chat_notes, interview_stories, leetcode_progress, interview_logs, ai_interactions, methodology_chunks (pgvector).

RLS is configured so students can only access their own data. methodology_chunks is publicly readable.

## Testing

Only 2 test files exist currently:
- `src/lib/ai/__tests__/naturalness-check.test.ts`
- `src/lib/methodology/__tests__/methodology.test.ts`

Priority test targets: auth.ts, mentor-engine.ts, API route handlers, db layer.

## Environment Variables

See `.env.example`. Required: `OPENAI_API_KEY`. For full functionality: Supabase credentials, JWT_SECRET, job API keys. The app gracefully falls back when keys are missing.

## Known Issues

- Supabase not connected (localStorage fallback active)
- No CI/CD pipeline
- Minimal test coverage
- No Vercel deployment config
- JWT_SECRET has a hardcoded dev fallback in auth.ts
