# PathFinder — Full Development Session Report

**Date:** 5 April 2026
**Project:** PathFinder — AI-powered career mentoring web app for university students
**Stack:** Next.js 16 + React 19 + TypeScript + Supabase + OpenAI GPT-4o
**Session span:** Multi-context conversation (context compacted once mid-session)

---

## 1. Project Overview

PathFinder is a career operating system designed to help university students land internships. It replaces the typical "spray and pray" job application approach with a structured, six-phase AI-guided pipeline:

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | Direction | Define target roles, industries, tech stack, and location |
| 2 | CV | Upload and optimise CV with AI feedback, ATS auditing, and project suggestions |
| 3 | Jobs | Track internships, analyse job descriptions, get ATS keywords and match scores |
| 4 | Networking | Generate tailored outreach messages, coffee chat scripts, and follow-up cadences |
| 5 | Interview | LeetCode practice, STAR story builder, mock questions, company briefings |
| 6 | Tracker | Kanban-style application pipeline with rejection diagnosis and weekly targets |

A central **Dashboard** ties everything together with four "pillar" metric cards (Clarity, Positioning, Networking, Consistency), a Next Best Action engine, weekly application counter, and a phase progress pipeline.

The app incorporates a proprietary **TechTalk methodology** encoded into TypeScript modules under `src/lib/methodology/`, covering CV Blueprint rules, Networking strategies, Coffee Chat frameworks, Four Pillars scoring, and Interview Prep structures. These feed into the **Mentor Engine** (`src/lib/ai/mentor-engine.ts`), which constructs methodology-aware prompts before sending them to OpenAI GPT-4o.

---

## 2. Work Completed — Chronological Summary

### Phase A: Foundation & Infrastructure (Commits 1–3)

**Commit `ef77af3` — Initial Create Next App scaffold**

**Commit `85f578f` — Mentor Engine architecture**
- Built the AI reasoning layer with methodology-driven prompt construction

**Commit `2f6b45a` — PathFinder foundation**
- Mentor Engine (`src/lib/ai/mentor-engine.ts`) — 473 lines of methodology-aware AI orchestration
- RAG retrieval layer (`src/lib/ai/retrieval.ts`) — Supabase vector search for context-aware responses
- Authentication system (`src/lib/auth.ts`) — Supabase auth with session management
- Methodology modules: CV Blueprint, Networking, Coffee Chat, Four Pillars, Interview Prep
- Prompt templates for all phases (`src/lib/prompts/`)
- Supabase database schema (`src/lib/supabase/schema.sql`) — users, CVs, jobs, applications, contacts, interviews
- TypeScript database types (`src/types/database.ts`)
- NeetCode problem dataset (`src/lib/neetcode-data.ts`)
- Constants file with target roles, tech stacks, industries, countries/cities

**Commit `9e4fd4f` — State management, dashboard, API routes, providers**
- Zustand stores: `app-store.ts` (persisted dashboard state), `auth-store.ts` (auth state)
- localStorage store: `src/lib/store.ts` (phase page state for CV, jobs, networking, contacts, applications)
- Dashboard page with four-pillar cards, NBA engine, quick links
- Providers wrapper (Zustand hydration)
- Top navigation component
- Landing page with hero, problem section, solution section, features, social proof, CTA
- UI component library: GlowCard, MagBtn, DotGrid, Typography, Icons, hooks
- 27 API routes across all phases

### Phase B: 14 New Features (Commit `c6023d5`)

Incorporated features from `pathfinder-additional-features-list.md`:

| # | Feature | Page | Description |
|---|---------|------|-------------|
| 1 | Explore Roles | Direction | Conversational AI career exploration mode (wizard/explore toggle) |
| 2 | LinkedIn Quick Check | CV | Collapsible accordion to audit LinkedIn profile sections |
| 3 | Vague Terms Detection | CV | Flags weak CV language using CV_BLUEPRINT.vagueTerms.flagWords |
| 4 | ATS Keyword Visualisation | Jobs | Table grid showing matched/missing keywords with colour coding |
| 5 | Cover Letter Generator | Jobs | AI-generated cover letters with copy-to-clipboard |
| 6 | Visa Sponsorship Check | Jobs | Info card about visa sponsorship considerations |
| 7 | Education Card | Networking | Dismissible "why networking matters" card with statistics |
| 8 | Contact Discovery Templates | Networking | Pre-built LinkedIn search query templates |
| 9 | AI Do's & Don'ts | Networking | Contextual reminder tips for outreach |
| 10 | Startup Cold Outreach | Networking | 4th outreach type for founder-targeted messages |
| 11 | Follow-Up Guide | Networking | 4-step cadence timeline + AI thank-you note generator |
| 12 | Referral Package Generator | Networking | Generates complete referral request packages |
| 13 | Company Briefing | Interview | AI research report on any company (new tab) |
| 14 | Feedback Log | Interview | Track interview performance with star ratings and AI pattern analysis |

**Additional API routes created:**
- `POST /api/direction/explore` — conversational role exploration
- `POST /api/linkedin/check` — LinkedIn profile audit
- `POST /api/cover-letter/generate` — cover letter generation
- `POST /api/network/follow-up` — follow-up thank-you notes
- `POST /api/network/referral-package` — referral package generation
- `POST /api/interview/company-briefing` — company research
- `POST /api/interview/feedback` — interview feedback analysis

**Application type extended** with `rejectionTiming` and `appliedDate` fields for rejection diagnosis and weekly counter features.

### Phase C: Responsive Layout & 3D Dashboard (Commit `1577484`)

#### Responsive Layout Fixes

**Navigation (`top-nav.tsx`):**
- Rewrote as mobile-first with hamburger menu
- Breakpoint: `<lg` (1024px) shows hamburger, `lg+` shows desktop links
- Mobile dropdown: full-width links with 44px min-height touch targets, glassmorphic backdrop
- Auto-closes on route change via `usePathname()` listener
- Desktop link gap: `gap-3` at `lg`, `gap-6` at `xl+`

**Global styles (`globals.css`):**
- Added `.page-container` class: `max-width: 1060px`, centered, `padding: 88px 24px 64px`
- Wrapped in `@layer base` to fix Tailwind v4 CSS layer specificity issue
- Added `.card` base class and `.overflow-safe` utility
- Responsive media query bumps horizontal padding to 32px at `sm+`

**Landing page (`landing-sections.tsx`):**
- Phase grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (was fixed `repeat(6, 1fr)`)
- Problem cards: `grid-cols-1 sm:grid-cols-3` (was fixed `repeat(3, 1fr)`)
- Stats row: `grid-cols-1 sm:grid-cols-3` (was fixed `repeat(3, 1fr)`)
- Testimonials: `grid-cols-1 sm:grid-cols-3` (was fixed `repeat(3, 1fr)`)

**All 6 phase pages:**
- Wrapped in `page-container overflow-safe` for consistent max-width and padding
- Mobile-first stacking with `flex-col` defaults
- Tab bars (`interview/page.tsx`): `overflow-x-auto` for horizontal scrolling on mobile
- Form inputs: full-width on mobile
- Button grids: 2x2 on mobile, inline on desktop
- Touch targets: minimum 44px height throughout

#### 3D Dashboard Elements (4 new components)

**`ParticleField.tsx`** — 80 instanced spheres using `@react-three/fiber`
- Drift animation in 3D space with randomised velocities
- `#0a0a0a` colour at ~0.15 opacity for subtle effect
- Fixed position behind all content, `pointerEvents: "none"`, `zIndex: 0`
- Hidden below 768px viewport width
- Wrapped in `<Suspense>` with WebGL availability check

**`TiltCard.tsx`** — CSS 3D perspective card
- `perspective(800px)` with `rotateX/rotateY` based on pointer position
- Maximum 6-degree tilt, 300ms ease transition
- `will-change: transform` for GPU acceleration
- Wraps the four pillar metric cards on dashboard

**`PhasePipeline3D.tsx`** — 6-phase visual progress indicator
- CSS 3D perspective with 4-degree `rotateX` for depth
- Connected dots with lines between phases
- Completed phases: solid dots, current phase: pulsing animation, future: dimmed
- Derives state from Zustand app store

**`GlassCard.tsx`** — Glassmorphism wrapper
- `backdrop-filter: blur(12px)`
- `rgba(255, 255, 255, 0.7)` semi-transparent background
- Multi-layer `box-shadow` for floating effect
- Wraps NBA section and weekly application counter

**New dependencies added:**
- `three` — 3D rendering library
- `@react-three/fiber` — React renderer for Three.js
- `@react-three/drei` — Helper components for R3F

---

## 3. Bugs Found & Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `Can't resolve 'tailwindcss' in 'c:\Users\timio'` | Turbopack inferred wrong workspace root due to multiple lockfiles in parent directories | Added `turbopack: { root: __dirname }` to `next.config.ts` |
| Dev server lock file stale after killing processes | `.next/dev/lock` not cleaned up | `rm -rf .next/dev/lock` before restart |
| `Type 'unknown' is not assignable to type 'ReactNode'` (3 occurrences in `interview/page.tsx`) | `briefingResult` and `fbAiResult` typed as `Record<string, unknown>`. `&&` short-circuit could return `unknown` | Converted to ternaries: `{x ? (...) : null}` and added `as string[]` casts for array maps |
| `Property 'strengths' does not exist on type 'string'` (`networking/page.tsx` line 261) | `getCvSummary()` returns a `string`, code tried to access `.strengths` property | Fixed to `cv ? [cv.slice(0, 200)] : []` |
| `.page-container` styles not applying (0px padding) | Tailwind v4's `@import "tailwindcss"` creates CSS layers that override plain custom CSS | Wrapped custom classes in `@layer base { }` |
| Nav links overflowing at 768px tablet viewport | 6 nav links + divider + Dashboard button too wide for `sm` (640px) breakpoint | Changed desktop nav breakpoint from `sm` to `lg` (1024px) |
| Landing page horizontal overflow at tablet | `phase-grid` fixed at `repeat(6, 1fr)`, `problem-grid`/`stats-row`/`testimonials-grid` fixed at `repeat(3, 1fr)` | Made all grids responsive with Tailwind `grid-cols-*` classes |

---

## 4. Final Codebase Statistics

| Metric | Value |
|--------|-------|
| Total source files (`.ts` + `.tsx`) | 78 |
| Total lines of source code | ~13,500 (diff from initial) |
| Page components | 8 (landing, dashboard, direction, cv, jobs, networking, interview, tracker) |
| API routes | 27 |
| UI components | 14 (top-nav, glow-card, mag-btn, dot-grid, typography×3, icons, hooks, 4 dashboard components) |
| Zustand stores | 2 (app-store, auth-store) |
| localStorage store | 1 (store.ts) |
| Methodology modules | 5 (cv-blueprint, networking, coffee-chat, four-pillars, interview-prep) |
| Prompt template files | 5 (cv, direction, interview, networking, project-builder) |
| Git commits | 6 |
| Dependencies added | ~12 (zustand, three, @react-three/fiber, @react-three/drei, openai, @supabase/supabase-js, pdf-parse, etc.) |

---

## 5. Visual Verification Results

Testing was performed at three breakpoints using the Claude Preview tool:

| Breakpoint | Viewport | Nav | Layout | Overflow | 3D Elements |
|------------|----------|-----|--------|----------|-------------|
| Mobile | 375×812 | Hamburger menu, 44px touch targets | Single-column stacking, full-width cards | None | Hidden (ParticleField not rendered) |
| Tablet | 768×1024 | Hamburger menu | 2-3 column grids, proper page-container padding | None | Partially visible |
| Desktop | 1280×800 | Full nav links + Dashboard button | Multi-column layouts, glassmorphism, tilt cards | None | All visible (particles, tilt, pipeline, glass) |

**Pages verified at mobile (375px):**
- Dashboard — pillar cards stack vertically, no overlap
- Direction — wizard/explore toggle and form fields full-width, 2-col tech stack grid
- CV — upload area and analysis sections stack properly
- Jobs — form fields and ATS grid responsive
- Networking — education card, outreach buttons in 2×2 grid
- Interview — 5 tabs scrollable horizontally, content stacks
- Tracker — pipeline cards stack vertically, weekly counter responsive

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Next.js 16 App                │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Landing  │  │Dashboard │  │ 6 Phase Pages│  │
│  │  Page    │  │  + 3D    │  │  (client)    │  │
│  └──────────┘  └────┬─────┘  └──────┬───────┘  │
│                     │               │           │
│              ┌──────┴───────────────┴──────┐    │
│              │     State Management        │    │
│              │  Zustand (app + auth store) │    │
│              │  localStorage (phase store) │    │
│              └──────────┬──────────────────┘    │
│                         │                       │
│              ┌──────────┴──────────────┐        │
│              │    27 API Routes        │        │
│              │  /api/cv/* /api/jobs/*  │        │
│              │  /api/direction/*  ...  │        │
│              └──────────┬──────────────┘        │
│                         │                       │
│              ┌──────────┴──────────────┐        │
│              │    Mentor Engine        │        │
│              │  Methodology modules    │        │
│              │  Prompt templates       │        │
│              │  RAG retrieval          │        │
│              └──────────┬──────────────┘        │
│                         │                       │
│              ┌──────────┴──────────────┐        │
│              │   External Services     │        │
│              │  OpenAI GPT-4o          │        │
│              │  Supabase (DB + Auth)   │        │
│              │  Supabase (Vectors/RAG) │        │
│              └─────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

---

## 7. How to Run

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY

# 3. Run database migrations (in Supabase dashboard or CLI)
# Use src/lib/supabase/schema.sql

# 4. Start dev server
npm run dev
# Opens at http://localhost:3000
```

The app works partially without Supabase/OpenAI keys — the UI, navigation, localStorage-based state, and client-side features all function. AI-powered features (CV analysis, outreach generation, interview prep, etc.) require valid API keys.

---

## 8. File Tree (Key Files)

```
pathfinder/
├── .claude/launch.json                    # Dev server config
├── .env.example                           # Environment variables template
├── next.config.ts                         # Turbopack root fix
├── package.json                           # Dependencies
├── src/
│   ├── app/
│   │   ├── globals.css                    # Global styles + @layer base utilities
│   │   ├── layout.tsx                     # Root layout with Providers + TopNav
│   │   ├── page.tsx                       # Landing page
│   │   ├── dashboard/page.tsx             # Dashboard with 3D elements
│   │   ├── direction/page.tsx             # Phase 1: Career Direction
│   │   ├── cv/page.tsx                    # Phase 2: CV Optimiser
│   │   ├── jobs/page.tsx                  # Phase 3: Jobs & Internships
│   │   ├── networking/page.tsx            # Phase 4: Networking
│   │   ├── interview/page.tsx             # Phase 5: Interview Prep
│   │   ├── tracker/page.tsx               # Phase 6: Application Tracker
│   │   └── api/                           # 27 API routes (see above)
│   ├── components/
│   │   ├── top-nav.tsx                    # Responsive nav (hamburger + desktop)
│   │   ├── providers.tsx                  # Zustand + auth providers
│   │   ├── dashboard/
│   │   │   ├── GlassCard.tsx              # Glassmorphism wrapper
│   │   │   ├── ParticleField.tsx          # 3D particle background
│   │   │   ├── PhasePipeline3D.tsx        # 3D phase progress
│   │   │   └── TiltCard.tsx               # CSS perspective tilt
│   │   └── ui/
│   │       ├── glow-card.tsx              # Animated hover card
│   │       ├── mag-btn.tsx                # Magnetic button
│   │       ├── landing-sections.tsx       # Landing page sections
│   │       ├── typography.tsx             # Heading, Mono, Tag components
│   │       ├── icons.tsx                  # SVG icon components
│   │       ├── dot-grid.tsx              # Background dot pattern
│   │       └── hooks.ts                   # useInView, useParallax, useCounter
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── mentor-engine.ts           # Core AI orchestration (473 lines)
│   │   │   └── retrieval.ts               # Supabase vector RAG
│   │   ├── methodology/
│   │   │   ├── cv-blueprint.ts            # CV rules & vague terms
│   │   │   ├── networking.ts              # Outreach frameworks
│   │   │   ├── coffee-chat.ts             # Coffee chat scripts
│   │   │   ├── four-pillars.ts            # Dashboard scoring
│   │   │   └── interview-prep.ts          # Interview structures
│   │   ├── prompts/                       # 5 prompt template files
│   │   ├── stores/
│   │   │   ├── app-store.ts               # Zustand persisted store
│   │   │   └── auth-store.ts              # Auth state
│   │   ├── store.ts                       # localStorage phase store
│   │   ├── ai.ts                          # OpenAI client wrapper
│   │   ├── auth.ts                        # Auth utilities
│   │   ├── constants.ts                   # Roles, stacks, industries
│   │   ├── neetcode-data.ts               # LeetCode problems dataset
│   │   └── supabase/
│   │       ├── client.ts                  # Supabase client
│   │       └── schema.sql                 # Database schema
│   └── types/
│       ├── database.ts                    # DB type definitions
│       └── pdf-parse.d.ts                 # PDF parse types
```

---

## 9. Session Timeline

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Initial continuation — commit existing work | Committed stores, API routes, dashboard, providers |
| 2 | User asked for full project explanation | Provided detailed walkthrough of all features, methodology integration, and how to run |
| 3 | User provided `pathfinder-additional-features-list.md` | Implemented 14 new features across all 6 phase pages + 7 new API routes |
| 4 | Fixed TypeScript compilation errors | 4 type errors resolved (unknown→ReactNode, string→object property access) |
| 5 | User requested comprehensive UI/layout refinement | Rewrote nav as responsive hamburger, added page-container system, created 4 dashboard 3D components |
| 6 | Context compacted (session continuation) | Resumed visual verification from where it left off |
| 7 | Fixed Tailwind v4 `@layer base` issue | `.page-container` styles now apply correctly |
| 8 | Fixed nav overflow at tablet | Changed desktop nav breakpoint from `sm` to `lg` |
| 9 | Fixed landing page grid overflow | Made phase-grid, problem, stats, testimonials grids responsive |
| 10 | Visual verification at 375px, 768px, 1280px | All pages pass — no overflow, proper stacking, 3D elements hidden/visible correctly |
| 11 | Final build verification | Clean pass, all 40 routes compiled |
| 12 | Committed all responsive + 3D changes | Commit `1577484` |

---

## 10. Known Limitations & Future Work

- **No Supabase instance connected** — the app uses localStorage for all client state; Supabase features (auth, RAG, persistent storage) require a live Supabase project
- **No OpenAI key** — AI features return errors without a valid `OPENAI_API_KEY`
- **No drag-and-drop** — the tracker pipeline mentions drag reordering but uses dropdown-based stage changes
- **No real-time sync** — all state is per-browser via localStorage/Zustand persist
- **No dark mode** — only light theme implemented
- **No tests** — no unit or integration tests exist yet
- **Landing page `sm` breakpoint (640–1023px)** — shows hamburger menu; could potentially show a condensed nav at this range
- **PDF upload** — CV page accepts PDF but `pdf-parse` requires server-side processing

---

*Report generated from Claude Code session on 5 April 2026. Total of 6 commits, 86 files changed, ~13,500 lines of code added.*
