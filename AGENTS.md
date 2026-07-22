# AGENTS.md

## Project Overview

PathFinder is an AI-powered internship navigation platform for university students. It guides users through 6 phases: career direction, CV optimization, job discovery, networking, interview prep, and application tracking.

Product emphasis is deliberately weighted toward the two phases that convert: **networking/referrals and interview readiness**. The readiness score in `lib/pf/progress.ts` reflects that weighting.

## Tech Stack

- **Framework**: Next.js 16.1.6, React 19.2.3, TypeScript 5
- **Styling**: Tailwind CSS 4, plus a warm-paper design system scoped to `.pf` (`data-theme` light/dark)
- **State**: Zustand 5 — `lib/pf/store.ts` (the live app, persisted to localStorage) and `lib/stores/*` (app-store, auth-store)
- **Database**: Supabase PostgreSQL with pgvector — **deployed**; migrations in `supabase/migrations/`
- **AI**: OpenAI via direct fetch — `gpt-4.1-mini` for route handlers (`lib/ai.ts`), `gpt-4o` in `lib/ai/mentor-engine.ts`, `text-embedding-3-small` for RAG
- **Auth**: Custom JWT (jose) + PBKDF2 password hashing (`lib/auth.ts`)
- **File parsing**: pdf-parse (PDF), mammoth (DOCX)
- **Testing**: Vitest 4 + Testing Library (jsdom)
- **Validation**: Zod 4 — on request bodies *and* on AI responses

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run tests (vitest watch)
npm run test:run     # Run tests once
npm run test:coverage # Run tests + enforce the coverage ratchet
npm run lint         # ESLint — currently clean; CI fails on any error
```

CI (`.github/workflows/ci.yml`) runs `npm ci`, `tsc --noEmit`, `test:coverage`, `lint`, and `build`. All are hard gates.

## Architecture

### AI response handling (read before touching an AI route)

`callAI<T>()` is a **compile-time cast only** — nothing checks that the model returned shape `T`. A route that reads `result.foo ?? fallback` against a wrong shape ships an empty HTTP 200: no content, no error, no log. That failure mode shipped several broken features before it was caught.

So AI routes use **`callAIValidated(params, schema, context)`**, which parses the response with Zod and throws `AIError` on a mismatch, letting the route's existing `catch` serve its real fallback *and* log the problem. Two helpers in `lib/ai.ts`:

- `aiShape(schema)` — tolerates the payload arriving at the root **or** nested under `data`. The same prompt genuinely varies between runs; pinning one shape makes a working feature fail intermittently.
- `aiEnvelope()` — validates the methodology envelope `{ …, data: { … } }`, hard-failing only when `data` is entirely empty.

**When adding an AI route, check what the prompt actually asks for.** Most prompt builders nest the payload under `data`; a schema that expects it at the root will fail every time and silently serve the fallback.

### API Routes (`src/app/api/`)

Route Handlers, POST unless noted. Auth routes set httpOnly JWT cookies. Middleware applies rate limits (auth 10/min, AI 30/min, `AI_DAILY_QUOTA` 60/day).

- `/auth/{signup,login,logout,me}` — JWT auth with httpOnly cookies
- `/auth/password-reset/{request,confirm}`, `/auth/verify-email/{request,confirm}`
- `/account/{export,delete}` — GDPR data export and account deletion
- `/profile` — profile read/write
- `/direction`, `/direction/{explore,title-variants}` — career direction wizard
- `/cv/{analyze,ats-audit,match,projects}` — CV upload, parsing, AI analysis
- `/jobs/{search,analyze}` — job search and JD analysis. `search` returns real
  Adzuna listings when `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` are set, and an empty
  list with `configured: false` otherwise. **It must never return placeholder
  listings** — it previously shipped three invented companies with
  `example.com` apply links. Tests in `__tests__/search.test.ts` enforce that.
- `/intel/analyze` — opportunity/priority-move analysis for the command centre
- `/networking/{outreach,analyze-profile}` — AI-generated outreach
- `/network/{coffee-chat-prep,follow-up,referral-package,startup-outreach}` — networking prep
- `/interview/{questions,company-briefing,feedback,star-builder,star-tweak,rate-solution,random-problem}`
- `/cover-letter/generate`, `/project-builder/generate`, `/linkedin/check`
- `/analytics/dashboard`
- `/health` — health check (GET); probes OpenAI and Supabase

### Career-OS (`src/lib/pf/`)

The spine of the app. Nothing derived is stored twice:

- `events.ts` — append-only typed event log; every meaningful action appends one
- `profile.ts` — `deriveProfile()`: one normalized view computed from store state + events
- `progress.ts` — `computeProgress()`: every progress number in the product, weighted toward networking/interview
- `recommendations.ts` — ranks the single next action
- `store.ts` — the Zustand store (persisted, `skipHydration`)
- `logic.ts`, `data.ts`, `orchestrator.ts` — pure derivation helpers, static content, AI orchestration

**Progress must stay evidence-derived.** Self-reported input (e.g. the Stage-00 sliders) never feeds the CV/networking/interview pillars — showing "CV 45%" before a CV exists is fabricated progress. Onboarding hands over its *target* (which is real input) and logs baseline events; the pillars stay at zero until real work exists.

### Other core libraries (`src/lib/`)

- `ai.ts` — OpenAI calls, `callAIValidated`, `aiShape`, `aiEnvelope`, `AIError`
- `ai/mentor-engine.ts` — builds UserContext from the DB, picks methodology (static vs RAG), calls OpenAI
- `ai/retrieval.ts` — RAG: embeds/retrieves methodology chunks via pgvector
- `ai/naturalness-check.ts` — rule-based AI-written text detector
- `auth.ts` — JWT create/verify, PBKDF2 hashing, cookies
- `api.ts` — `readBody`/`readLoose` request validation helpers
- `hooks.ts` — `useIsHydrated`, `usePrefersReducedMotion` (both `useSyncExternalStore`)
- `theme.ts` — `useThemeMode`, `setTheme`; `ThemeController` in `layout.tsx` owns `<html data-theme>`
- `rate-limit.ts`, `logger.ts`
- `supabase/client.ts` — anon client for the browser, service-role for the server
- `db/*.ts` — typed data access layer
- `prompts/*.ts`, `methodology/*.ts`, `knowledge/*.ts`

### Frontend Pages (`src/app/`)

- `page.tsx` — marketing landing; ASCII neural-globe hero on a 2D canvas (no WebGL)
- `start/` — Stage 00 onboarding: target + baseline, then hands off to the Career-OS
- `intel/` — command centre (readiness, next action, event log, opportunity pipeline)
- `direction/`, `cv/`, `jobs/`, `networking/`, `interview/`, `tracker/` — the six phases
- `universities/` — B2B2C pitch to university career services
- `settings/`, `login/`, `forgot-password/`, `reset-password/`, `verify-email/`, `privacy/`, `terms/`

**Marketing copy must stay honest.** No invented testimonials, partner logos, or outcome statistics — a product that tells students not to embellish their CV cannot embellish its own landing page. Illustrative UI mockups are fine when labelled as such.

## Database

Deployed to Supabase with migrations in `supabase/migrations/` (`0001_init`, `0002_client_state`, `0003_auth_tokens`, `0004_rag_functions`). Tables: users, profiles, cvs, applications, networking_contacts, coffee_chat_notes, interview_stories, leetcode_progress, interview_logs, ai_interactions, methodology_chunks (pgvector).

RLS restricts students to their own rows; `methodology_chunks` is publicly readable. The server uses the service-role key and scopes queries by `user_id` at the application layer.

RAG is seeded: `methodology_chunks` holds embedded chunks (1536-dim, text-embedding-3-small) retrieved via the `match_methodology` RPC.

## Testing

16 test files / 160 tests. Covered: `auth.ts`, the AI validation layer, the db layer, pure Career-OS derivation (`profile`, `logic`, onboarding handoff), `CountUp`, email link resolution, and the health / outreach / jobs-search route handlers.

`npm run test:coverage` reports coverage and enforces a **ratchet** — thresholds in `vitest.config.ts` sit just below current coverage (≈19% lines, 13% branches), so the build fails if coverage goes backwards but is not permanently red against the 80% target. Raise them as tests land. `all: true` is set, so untested files count as 0 rather than vanishing from the report.

Still thin: most route handlers, and the phase pages themselves.

## Environment Variables

See `.env.example`. Required: `OPENAI_API_KEY`, `JWT_SECRET` (auth throws at startup without it), Supabase credentials. Optional: job API keys, `NEXT_PUBLIC_APP_URL`. The app degrades gracefully when optional keys are missing.

## Known Issues

- Test coverage is well below the 80% target, especially for route handlers
- `universities/` still points at a placeholder `partnerships@pathfinder.app` mailbox
- `NEXT_PUBLIC_APP_URL` is unset in production, so absolute links fall back to relative
