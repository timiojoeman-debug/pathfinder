# PathFinder — AI-Powered Internship Navigation

PathFinder is a career operating system for university students. It guides them
through the entire internship journey — defining a career direction, optimizing
their CV, discovering roles, networking strategically, preparing for interviews,
and tracking applications — where every action feeds one persistent Career
Profile that the AI mentor reasons over.

## The six phases

| Phase | Surface | What it does |
|-------|---------|--------------|
| 1 — Career Direction | `/direction` | Wizard + open-ended explore mode → a direction statement with a specificity score |
| 2 — CV Optimizer | `/cv` | Upload PDF/DOCX, ATS audit, job-match scoring, skill-gap project ideas |
| 3 — Job Discovery | `/jobs` | Search (Adzuna / JSearch), paste job descriptions, compatibility analysis |
| 4 — Networking | `/networking` | AI outreach (recruiter / hiring manager / peer), coffee-chat prep, referral packages, LinkedIn analysis |
| 5 — Interview Prep | `/interview` | NeetCode/LeetCode tracker, STAR story builder, AI question generator, company briefings |
| 6 — Application Tracker | `/tracker` | Kanban pipeline + consistency dashboard |

Under the hood, each phase emits typed **career events**; a derived Career
Profile, a progress engine, and a recommendation engine project over that event
stream to drive cross-phase intelligence and the AI mentor's memory.

## Tech stack

- **Framework** — Next.js 16 (App Router), React 19, TypeScript 5
- **Styling** — Tailwind CSS 4, warm-paper design system (light "paper" / dark "night" themes)
- **State** — Zustand 5, persisted to `localStorage` and hydrated from the DB on login
- **Database** — Supabase (Postgres + pgvector), accessed through a typed data layer
- **Auth** — Custom JWT (`jose`) + PBKDF2 password hashing, httpOnly cookies
- **AI** — OpenAI (GPT-4o) via direct fetch; `text-embedding-3-small` for RAG retrieval
- **File parsing** — `pdf-parse` (PDF), `mammoth` (DOCX)
- **3D** — React Three Fiber + Three.js (dashboard visuals)
- **Validation** — Zod 4 at every API boundary
- **Testing** — Vitest 4 + Testing Library

## Getting started

### Prerequisites

- Node.js 20+
- An OpenAI API key (for live AI features)
- A Supabase project (for persistence and auth) — optional for a local demo

### Setup

```bash
npm install
cp .env.example .env.local     # then fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Graceful degradation

The app is built to run with missing keys:

- **No OpenAI key** → AI routes return sensible fallbacks so the full workflow is
  still demoable. Local CV parsing (PDF/DOCX) works regardless.
- **No Supabase** → the app falls back to `localStorage`-only state. Sign-up and
  cross-device persistence require Supabase.

Supabase and JWT are resolved lazily, so `npm run build` succeeds with no env at all.

## Environment variables

See [`.env.example`](.env.example) for the full list. The important ones:

| Variable | Required for | Notes |
|----------|--------------|-------|
| `OPENAI_API_KEY` | AI features | Without it, AI routes return fallbacks |
| `NEXT_PUBLIC_SUPABASE_URL` | Persistence / auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Persistence / auth | Public anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB access | **Server only** — bypasses RLS; never expose to the client |
| `JWT_SECRET` | Auth | Session signing secret; generate a strong random value |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Job search | Adzuna API |
| `JSEARCH_API_KEY` | Job search | JSearch (RapidAPI) fallback |
| `RESEND_API_KEY` / `EMAIL_FROM` | Email | Verification / password reset; without a key, links are logged to the server in dev |
| `AI_DAILY_QUOTA` | AI rate limiting | Per-user daily cap (default 60) |
| `LOG_LEVEL` | Logging | `debug` \| `info` \| `warn` \| `error` |

## Database

The schema lives in [`supabase/migrations/`](supabase/migrations) — tables, RLS
policies, and triggers. See [`supabase/README.md`](supabase/README.md) for setup.

To apply migrations to a fresh Supabase project with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Authorization model:** the app authenticates with a custom JWT, not Supabase
Auth, so `auth.uid()` is null on server calls. The server therefore uses the
service-role client and enforces row ownership in the application layer
(`.eq('user_id', userId)`). RLS + owner policies are enabled as defense-in-depth.

## Project structure

```
src/
├── app/                    # App Router: pages + API routes
│   ├── page.tsx            # Marketing landing (3D hero)
│   ├── dashboard/          # Main dashboard / phase pipeline
│   ├── direction/ cv/ jobs/ networking/ interview/ tracker/   # The six phases
│   ├── login/ start/ verify-email/ forgot-password/ reset-password/  # Auth flows
│   ├── settings/ privacy/ terms/                              # Account & legal
│   └── api/                # Route handlers (auth, cv, jobs, direction, …)
├── components/             # UI + per-feature components (incl. pf/ design system)
├── lib/
│   ├── auth.ts             # JWT + PBKDF2
│   ├── api.ts              # Zod request validation helpers
│   ├── rate-limit.ts       # Sliding-window rate limit + per-user AI quota
│   ├── ai/                 # mentor-engine, retrieval (RAG), naturalness-check
│   ├── db/                 # Typed data-access layer
│   ├── methodology/        # Career frameworks (Four Pillars, CV Blueprint, …)
│   ├── prompts/            # Per-feature AI prompt builders
│   ├── stores/             # Zustand stores (app-store, auth-store)
│   └── supabase/           # Client factories (anon + service-role)
└── middleware.ts           # Rate limiting, JWT verification, AI quota
```

## Scripts

```bash
npm run dev        # Dev server (localhost:3000)
npm run build      # Production build
npm run start      # Serve the production build
npm run test       # Vitest (watch)
npm run test:run   # Vitest (once)
npm run lint       # ESLint
```

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and PRs to
`main`/`master`: typecheck (`tsc --noEmit`) and tests are hard gates; lint is
surfaced non-blocking (pre-existing debt in legacy modules); the production build
must pass. No secrets are needed — Supabase/JWT resolve lazily and the build is
env-safe.

## License

Private / unlicensed. All rights reserved.
