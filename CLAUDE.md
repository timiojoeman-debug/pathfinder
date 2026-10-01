# CLAUDE.md

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

### Wiring an AI route into a page

Client-side AI calls go through **`useAiTask(endpoint)`** (`lib/pf/use-ai.ts`), never a bare
`fetch` in a component. It owns loading, error text, and aborting a superseded request, and it
maps two statuses that a raw error string handles badly:

- **401** — every phase page works logged-out (state is local) but every AI *generator* sits behind the
  auth cookie, so "not signed in" is the first response a student sees the moment they try to generate.
  It surfaces as `needsAuth`, rendered as guidance with a sign-in link, not as a red failure. (Job
  search is exempt — it's on the guest allowlist and runs logged-out; see the Guest tier note below.)
- **429** — the AI bucket is 30/min with a real daily quota, so this gets its own wording.

Panels are built from the primitives in `components/pf/ai-panel.tsx` (`GenerateButton`, `AiError`,
`AiSection`, `AiList`, `AiTag`, `AiCaveat`) so every generate surface behaves the same way, and
every generated block carries a caveat line — AI output here is a first draft, and the product
cannot ask students to be honest about their CV while presenting guesses as facts.

Each wired action emits an `AiConsulted` event so the work shows up in the Career-OS event log.

Three traps that have each cost a session:

- **Not every route is an envelope, and not every field is under `data`.** Open the route and its
  prompt builder before writing the client type. `/intel/analyze` uses `aiShape` and answers at the
  root; `/cv/match` returns `nonNegotiables`/`hasBlockers` *beside* the envelope, and
  `/linkedin/check` returns `keywordAnalysis` the same way. Use `envelopeMessage()` from `lib/ai.ts`
  when reading a message server-side — reading it off the root is what silently scored every
  outreach message against an empty string.
- **Body field names are not guessable.** `/project-builder/generate` wants `skillGaps`, not
  `missingSkills`; `/interview/star-builder` wants `rawStory` as an object of the four beats, not a
  string. A wrong name is silently ignored and the model answers from an empty prompt.
- **A 200 is not always a result.** `/intel/analyze` degrades to
  `{source:"heuristic",roles:[],priorityMoves:[]}` on any failure, which `useAiTask` sees as
  success. Check `source` and say the analysis degraded rather than rendering an empty panel.

Prompt context strings (`studentProfile`, `cvStrengths`) come from `lib/pf/ai-context.ts`, not from
per-call-site prose — building them inline drifted immediately and gave the same student a different
description on each page.

### API Routes (`src/app/api/`)

Route Handlers, POST unless noted. Auth routes set httpOnly JWT cookies. Middleware applies rate limits
(auth 10/min, AI 30/min, general 120/min, `AI_DAILY_QUOTA` 60/day). Counters live in the
`rate_limit_buckets` table via the `rate_limit_hit` RPC, so they hold **across serverless instances** —
an in-memory Map gave each instance its own counter and the effective limit was (instances × limit).
If the store is unreachable the limiter degrades to per-instance counting rather than failing requests.
**`/api/auth/me` and `/api/auth/logout` are deliberately in the general bucket**: the client calls
`me` on navigation, and throttling it at the credential limit locks a browsing user out of their own session.

**Guest tier**: every `/api/*` route requires the auth cookie *except* the public allowlist in
`middleware.ts` (`auth/*`, `health`, `intel/analyze`) and the guest allowlist in `rate-limit.ts`
(`isGuestAllowed` — currently just `/api/jobs/search`). A guest job search touches no user data (GitHub
+ Adzuna, search terms only), so it runs logged-out, metered by a per-IP daily budget
(`ANON_AI_DAILY_QUOTA`, default 10) so it can't run up the Adzuna quota. An expired/invalid token
degrades to the guest path rather than a hard 401. AI generators and account-scoped routes stay behind
login — do **not** widen `isGuestAllowed` to an OpenAI route without a matching per-IP cost cap.

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
  Filters: `location` maps to Adzuna's `where`; `roleType`, `industry` and
  `workMode` are concatenated into `what`. Work mode is a **keyword narrowing,
  not a hard filter** (no job board exposes it as a field), and the UI says so.
  `companySize` was removed rather than left validated-and-ignored — Adzuna has
  no company-size data, so any control for it would be decorative.
- `/intel/analyze` — opportunity/priority-move analysis for the command centre
- `/networking/{outreach,analyze-profile}` — AI outreach and contact research
  (`analyze-profile` reads a pasted profile; live in `profile-research.tsx`)
- `/network/{coffee-chat-prep,follow-up,referral-package,startup-outreach}` — networking prep
- `/interview/{questions,company-briefing,feedback,star-builder,star-tweak,rate-solution,random-problem}`
- `/cover-letter/generate`, `/project-builder/generate`, `/linkedin/check`
- `/analytics/dashboard`
- `/mentor/{chat,narrate}` — the cross-page mentor and the profile narration.
  **Both are advisory only.** `narrate` restates the already-derived profile;
  `chat` answers questions about it and routes the student to the right page.
  Neither has tool calling, and the client writes nothing from either reply
  back into the store — an assistant that could write to the store could
  manufacture the progress every number is derived from. They sit under
  `/api/mentor/` so `classifyRoute` puts them in the AI bucket without
  dragging plain `/api/profile` read/write in with them.
- `/health` — health check (GET); probes OpenAI and Supabase

### Career-OS (`src/lib/pf/`)

The spine of the app. Nothing derived is stored twice:

- `events.ts` — append-only typed event log; every meaningful action appends one
- `profile.ts` — `deriveProfile()`: one normalized view computed from store state + events
- `progress.ts` — `computeProgress()`: every progress number in the product, weighted toward networking/interview
- `recommendations.ts` — ranks the single next action
- `store.ts` — the Zustand store (persisted, `skipHydration`)
- `logic.ts`, `data.ts`, `orchestrator.ts` — pure derivation helpers, static content, AI orchestration
- `leetcode.ts` — the NeetCode list: 18 categories, 100 real problems with verified
  LeetCode numbers and links. Progress is keyed by problem `slug`, and `ivSolved`
  (per-category counts) is a **projection** of `ivProblems`, recomputed on every
  toggle — never incremented, so the counts cannot drift from the ticked problems.
  `LEETCODE_TOTAL` and `LEET_ON_TRACK` are derived; do not hardcode 75 or 45 again.

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
- `rate-limit.ts` — shared counters (see the API-routes note above)
- `logger.ts` — structured logs; **`logger.error` also persists to `error_events`**, so a
  production failure is a query rather than a log-tail. Context is redacted for
  credential-shaped keys before storage. Use `logger.*` and never raw `console.*`, or the
  error is invisible — that is how a broken PDF parser hid behind a friendly 422.
- `supabase/client.ts` — anon client for the browser, service-role for the server
- `db/*.ts` — typed data access layer
- `prompts/*.ts`, `methodology/*.ts`, `knowledge/*.ts`

### Frontend Pages (`src/app/`)

- `page.tsx` — marketing landing: a scroll-scrubbed Alpine walk, an ASCII summit outline, and a
  click-driven wireframe route. Built as a static prototype in `cinematic/site/` (untracked) and ported
  into `components/landing/` (`markup.ts`, `runtime.js`, `route.js`) plus `app/landing.css` and
  `public/landing/`. Edit the prototype and regenerate with `python cinematic/tools/port.py`
  rather than hand-editing the port.
- `start/` — Stage 00 onboarding: target + baseline, then hands off to the Career-OS
- `intel/` — command centre (readiness, next action, event log, opportunity pipeline)
- `direction/`, `cv/`, `jobs/`, `networking/`, `interview/`, `tracker/` — the six phases
- `universities/` — B2B2C pitch to university career services
- `settings/`, `login/`, `forgot-password/`, `reset-password/`, `verify-email/`, `privacy/`, `terms/`

**Marketing copy must stay honest.** No invented testimonials, partner logos, or outcome statistics — a product that tells students not to embellish their CV cannot embellish its own landing page. Illustrative UI mockups are fine when labelled as such.

## Database

Deployed to Supabase with migrations in `supabase/migrations/` (`0001_init`, `0002_client_state`, `0003_auth_tokens`, `0004_rag_functions`, `0005_rate_limit`, `0006_error_events`). Tables: users, profiles, cvs, applications, networking_contacts, coffee_chat_notes, interview_stories, leetcode_progress, interview_logs, ai_interactions, methodology_chunks (pgvector), rate_limit_buckets, error_events.

RLS restricts students to their own rows; `methodology_chunks` is publicly readable. The server uses the service-role key and scopes queries by `user_id` at the application layer.

RAG is seeded: `methodology_chunks` holds embedded chunks (1536-dim, text-embedding-3-small) retrieved via the `match_methodology` RPC.

## Testing

90 test files / 594 tests. Covered: `auth.ts`, the AI validation layer (including `envelopeMessage`), the db layer, pure Career-OS derivation (`profile`, `logic`, onboarding handoff, `ai-context`), the LeetCode data and `toggleProblem` projection, the assistant slice's advisory boundary, the `useAiTask` client hook, `CountUp`, `NaturalnessNote`, email link resolution, and the health / outreach / jobs-search / rate-solution route handlers.

`npm run test:coverage` reports coverage and enforces a **ratchet** — thresholds in `vitest.config.ts` sit just below current coverage (currently ≈21.4% lines / 14.9% branches against thresholds of 20 and 14), so the build fails if coverage goes backwards but is not permanently red against the 80% target. Raise them as tests land. `all: true` is set, so untested files count as 0 rather than vanishing from the report.

Still thin: most route handlers, and the phase pages themselves.

## Environment Variables

See `.env.example`. Required: `OPENAI_API_KEY`, `JWT_SECRET` (auth throws at startup without it), Supabase credentials. Optional: job API keys, `NEXT_PUBLIC_APP_URL`. The app degrades gracefully when optional keys are missing.

## Known Issues

- Test coverage is well below the 80% target, especially for route handlers
- **AI routes left unwired on purpose** (not oversights — do not "fix" by wiring
  without re-reading why):
  - `/cv/projects` — redundant with `/project-builder/generate`, which is already
    live in `components/pf/cv/projects-panel.tsx` with richer output. A second
    project generator is a worse product, not a missing feature.
  - `/interview/star-tweak` — a strict subset of `/interview/star-builder`
    (tightened beats + tips, no feedback/questions/quality). The STAR tab already
    covers it; wiring it adds a button with no new capability.
  - `/interview/random-problem` — asks the model to invent a problem **and its
    LeetCode URL**. A hallucinated link is exactly the fabrication the 100-problem
    `leetcode.ts` list was built to remove, so the "surprise me" use case is served
    client-side from the real list in `components/pf/interview/practice-panel.tsx`
    instead, and this route stays dark.
  - `/analytics/dashboard` — a stub `GET` returning `{message: …}`. Analytics are
    already derived client-side by `progress.ts`; there is nothing to render until
    it actually queries Supabase.
  Live wiring examples to copy for genuinely new routes:
  `components/pf/interview/{questions,briefing,star}-tab.tsx`,
  `components/pf/interview/{practice,feedback-analysis}.tsx`,
  `components/pf/cv/{tailor,projects,linkedin}-panel.tsx`,
  `components/pf/networking/{contact-workspace,startup-panel,profile-research}.tsx`,
  `components/pf/intel/analysis-panel.tsx`.
- **`generateWithAI(fallback)` can serve a fabricated result as a 200.** Its
  fallback fires on any transient AI failure, so a route that fabricates content in
  that fallback ships it silently. `/interview/rate-solution` (a fixed `rating: 8`)
  and `/networking/analyze-profile` (generic "common ground" about a real person)
  both did this and were moved to `callAIValidated` + a 500 on failure — a rating
  or a shared connection invented when the model was down is the same
  confidence-over-no-evidence the product forbids everywhere else. Prefer
  `callAIValidated` for anything that scores or asserts.
- The mentor assistant (`components/pf/assistant.tsx`) is **advisory by decision,
  not by omission**. It has no tool calling and writes nothing to the store;
  `__tests__/assistant-slice.test.ts` guards that boundary. Giving it write
  access would let a misread question manufacture the progress every number in
  the product is derived from — if that changes, every write needs explicit
  confirmation and the tests should be updated deliberately, not deleted.
- `universities/` still points at a placeholder `partnerships@pathfinder.app` mailbox
- `NEXT_PUBLIC_APP_URL` is unset in production, so absolute links fall back to relative
