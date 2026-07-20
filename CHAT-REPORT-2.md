# PathFinder — Session 2 Development Report

**Date:** 8 April 2026
**Previous session:** 5 April 2026 (see `CHAT-REPORT.md`)
**Project:** PathFinder — AI-powered career mentoring web app for university students
**Stack:** Next.js 16 + React 19 + TypeScript + Supabase + OpenAI GPT-4o

---

## 1. Session Scope

This session implemented **4 new features** and **6 infrastructure improvements**, completing the items listed in the user's two-part specification. Work was executed in the prescribed order: Infra 2 -> Infra 6 -> Infra 1 -> Feature 2 -> Feature 4 -> Feature 3 -> Feature 1 -> Infra 3 -> Infra 4 -> Infra 5.

---

## 2. Features Implemented

### Feature 1: Title Variant Generator (Direction page)

After the Direction Wizard generates a career statement, the app auto-fetches 5-10 real job title variations from GPT-4o. Each variant includes a note explaining where it is commonly used (e.g., "Common at FAANG companies", "Used by agencies and consultancies").

**Files:**
- `src/app/api/direction/title-variants/route.ts` — NEW, POST endpoint accepting `role`, `techStack[]`, `industry`
- `src/lib/prompts/direction-prompts.ts` — Added `buildTitleVariantPrompt()` prompt builder
- `src/app/direction/page.tsx` — Added "Search With These Job Titles" UI section with copy-to-clipboard chips and "Copy All Titles" button

### Feature 2: Non-Negotiable Filter (Jobs page)

When the AI calculates a job match score, it now separately identifies dealbreaker requirements (years of experience, location constraints, visa/work authorisation, certifications, security clearance, degree requirements). A warning card shows each dealbreaker with a pass/fail indicator.

**Files:**
- `src/lib/prompts/cv-prompts.ts` — Extended `buildMatchScorePrompt()` with NON-NEGOTIABLE REQUIREMENTS section and JSON response schema
- `src/app/api/jobs/analyze/route.ts` — Passes `nonNegotiables`, `hasBlockers`, `blockerWarning` through to response
- `src/app/jobs/page.tsx` — Added `NonNegotiable` type and "Potential Dealbreakers" UI section after match score

### Feature 3: LinkedIn Keyword Mapper (CV page)

Enhances the existing LinkedIn Quick Check to generate a prioritised list of recruiter search keywords. Shows which keywords are found vs missing in the student's profile, with priority levels (high/medium/low) and suggested placement locations.

**Files:**
- `src/app/api/linkedin/check/route.ts` — Extended prompt with RECRUITER KEYWORD ANALYSIS section; accepts `targetRole`, `techStack`, `industry` fields
- `src/app/cv/page.tsx` — Added `KeywordEntry` type, extended `LinkedInResult`, added "Recruiter Keyword Coverage" UI section with found/missing indicators

### Feature 4: AI Naturalness Check

A rule-based (no AI call) text analyser that detects AI-generated writing patterns. Runs automatically on cover letters and all outreach message types. Scores text 0-100 with a human-readable verdict.

**Detection rules:**
| Rule | What it catches | Deduction |
|------|----------------|-----------|
| `em_dash` | Excessive em-dash usage (3+) | -5 per occurrence |
| `formal_language` | Phrases like "I am writing to express", "I would be delighted" | -8 each |
| `fake_metric` | Percentages not backed by CV data (e.g., "improved by 47%") | -12 each |
| `buzzword` | Corporate buzzwords: "leverage synergies", "paradigm shift", etc. | -6 each |
| `wrong_spelling_region` | US spelling when region is UK or vice versa (optimize vs optimise) | -4 each |
| `too_long` | Outreach >150 words, cover letters >350 words | -15 |
| `repetitive_structure` | 50%+ sentences starting with "I" | -10 |

**Verdict scale:** `natural` (80-100), `mostly_natural` (50-79), `needs_editing` (25-49), `heavily_ai` (0-24)

**Files:**
- `src/lib/ai/naturalness-check.ts` — NEW, 251 lines, pure function `checkNaturalness(text, options)`
- `src/app/api/cover-letter/generate/route.ts` — Runs naturalness check on generated cover letter
- `src/app/api/networking/outreach/route.ts` — Same integration
- `src/app/api/network/startup-outreach/route.ts` — Same integration
- `src/app/api/network/follow-up/route.ts` — Same integration
- `src/app/jobs/page.tsx` — Naturalness indicator after cover letter display
- `src/app/networking/page.tsx` — Naturalness indicators after outreach, startup outreach, and follow-up messages

---

## 3. Infrastructure Implemented

### Infra 1: Supabase Data Access Layer

A structured data access layer with individual modules per entity, centralised in `src/lib/db/`. Each module imports the Supabase client and exports typed CRUD functions. Designed to be swapped in when a Supabase instance is connected, while the app continues to work with localStorage in the meantime.

**Files:**
- `src/lib/db/profiles.ts` — `getProfile`, `updateProfile`, `updateDirection`
- `src/lib/db/cvs.ts` — `getCV`, `saveParsedCV`, `getCVAnalysis` (with upsert)
- `src/lib/db/applications.ts` — `getApplications`, `createApplication`, `updateApplicationStatus`, `deleteApplication`
- `src/lib/db/contacts.ts` — `getContacts`, `createContact`, `updateContact`
- `src/lib/db/stories.ts` — `getStories`, `createStory`, `updateStory`
- `src/lib/db/interviews.ts` — `getInterviewLogs`, `createInterviewLog`
- `src/lib/db/interactions.ts` — `storeInteraction`, `getInteractionHistory`
- `src/lib/db/index.ts` — Barrel re-export

### Infra 2: OpenAI Connection + Error Handling

Robust error handling for the OpenAI integration with a custom `AIError` class and structured HTTP status code mapping.

**`AIError` properties:**
- `status` — HTTP status code from OpenAI
- `retryable` — whether the client should retry
- `available` — whether the AI service is reachable
- `retryAfter` — seconds to wait before retrying (for 429s)

**Status code handling:**
| Code | Meaning | Retryable |
|------|---------|-----------|
| 401 | Invalid API key | No |
| 429 | Rate limited | Yes (with `retryAfter`) |
| 413 | Payload too large | No |
| 500 | OpenAI server error | Yes |
| 503 | Service unavailable | Yes |

**Files:**
- `src/lib/ai.ts` — `AIError` class, `isAIAvailable()`, `handleOpenAIErrorResponse()`, updated `callOpenAI()` and `generateWithAI()`
- `src/lib/ai/mentor-engine.ts` — Matching error handling in internal `callOpenAI()`
- `src/app/api/health/route.ts` — NEW, `GET /api/health` returns `{ openai: boolean, supabase: boolean, version: "0.1.0" }`

### Infra 3: Kanban Drag-and-Drop (Tracker page)

Replaced dropdown-based stage changes with full drag-and-drop using `@hello-pangea/dnd`.

**Implementation:**
- `DragDropContext` wrapping the entire pipeline
- Each stage column wrapped in `<Droppable>`
- Each application card wrapped in `<Draggable>`
- `onDragEnd` handler calls `moveCard()` from the Zustand store
- Visual feedback: column highlights with `var(--c-50)` on drag-over, cards get elevated shadow during drag

**Files:**
- `src/app/tracker/page.tsx` — Added DragDropContext, Droppable, Draggable wrappers with `onDragEnd` handler

### Infra 4: Dark Mode

System-aware dark mode using `next-themes` with a CSS variable inversion strategy. All existing `var(--c-*)` references automatically work in dark mode without changing any component code.

**Strategy:** The `.dark` class inverts the entire colour scale — `--c-50` (lightest) becomes `#111111` (near-black), `--c-900` (darkest) becomes `#fafafa` (near-white). This means every component that uses the existing CSS variables gets dark mode for free.

**Files:**
- `src/app/globals.css` — Added `.dark` class with inverted colour scale and `.dark .glass-card` overrides
- `src/components/providers.tsx` — Added `ThemeProvider` from `next-themes` (attribute="class", defaultTheme="system")
- `src/app/layout.tsx` — Added `suppressHydrationWarning` to `<html>` tag
- `src/components/top-nav.tsx` — Added theme toggle button (sun/moon icon) in desktop nav and mobile menu
- `src/components/dashboard/GlassCard.tsx` — Switched from inline styles to `.glass-card` CSS class for theme awareness

### Infra 5: Test Suite

Vitest test suite with 30 tests across 2 test files, covering methodology module structure and the naturalness checker.

**Test breakdown:**
| File | Tests | Coverage |
|------|-------|----------|
| `methodology.test.ts` | 19 | All 5 methodology modules — CV Blueprint (6 tests), Networking Strategy (4), Coffee Chat (4), Four Pillars (3), Interview Prep (2) |
| `naturalness-check.test.ts` | 11 | All 7 detection rules, whitelisted metrics, clean text scoring, verdict categories |

**Files:**
- `vitest.config.ts` — NEW, jsdom environment, React plugin, path aliases
- `src/test/setup.ts` — NEW, imports `@testing-library/jest-dom`
- `src/lib/methodology/__tests__/methodology.test.ts` — NEW, 19 structural tests
- `src/lib/ai/__tests__/naturalness-check.test.ts` — NEW, 11 rule-based tests
- `package.json` — Added `"test": "vitest"` and `"test:run": "vitest run"` scripts

**Dev dependencies added:** `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

### Infra 6: PDF Upload Improvements (CV page)

Server-side and client-side hardening of the CV upload flow.

**Improvements:**
- 10MB file size validation (server returns 413, client warns before upload)
- PDF text extraction error handling with empty/short text detection
- `text` FormData field support for paste-as-text fallback when PDF parsing fails
- Error state UI with contextual messages ("AI unavailable", "extraction failed", "file too large") and a Try Again button
- `AIError`-aware catch block in the upload handler

**Files:**
- `src/app/api/cv/analyze/route.ts` — Size validation, extraction fallback, AIError handling
- `src/app/cv/page.tsx` — Client-side size check, error states, extraction failure UI

---

## 4. Bugs Found & Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| JSX nesting error in tracker page (TS17008, TS17002) | Adding Draggable/Droppable wrappers created double-nested `<div>`s with mismatched tags | Merged Draggable's div with original card wrapper, removed duplicate `<div key={a.id}>` |
| DnD transform conflict | `transform: rotate(2deg)` on drag conflicted with @hello-pangea/dnd's internal transform | Replaced with `opacity: 0.95` + `boxShadow` for drag feedback |
| Methodology test failures (7/19) | Tests assumed arrays where source modules use objects (outreachVariants, targetGroups, questionBank) and `.id` where `.position` is used | Rewrote tests to match actual module shapes: `Object.keys()` for objects, `.position` instead of `.id` |

---

## 5. Changes Summary

| Metric | Value |
|--------|-------|
| Files modified | 22 |
| New files created | 14 |
| Lines added (excl. package-lock) | +936 |
| Lines removed | -140 |
| Net new lines | +796 |
| New API routes | 2 (`/api/health`, `/api/direction/title-variants`) |
| Total API routes | 31 |
| Total source files | 92 |
| Tests added | 30 (19 methodology + 11 naturalness) |
| Test result | 30/30 passing |
| Build result | Clean — 42 pages generated |

---

## 6. Updated Known Limitations

Items resolved from previous session's "Known Limitations" list:

| Previous Limitation | Status |
|---------------------|--------|
| No drag-and-drop | **Resolved** — @hello-pangea/dnd Kanban implemented |
| No dark mode | **Resolved** — next-themes with CSS variable inversion |
| No tests | **Resolved** — Vitest suite with 30 tests |
| PDF upload issues | **Resolved** — Size validation, extraction error handling, text fallback |

**Remaining limitations:**
- No Supabase instance connected — DAL is built but app still uses localStorage; connecting requires a live Supabase project and env vars
- No OpenAI key in environment — AI features return errors without `OPENAI_API_KEY`
- No real-time sync — state is per-browser via localStorage/Zustand persist
- Landing page `sm` breakpoint (640-1023px) — shows hamburger menu; could show condensed nav

---

## 7. Updated File Tree (New & Changed Files)

```
pathfinder/
├── vitest.config.ts                              # NEW — Vitest configuration
├── package.json                                  # MODIFIED — test scripts + new dev deps
├── src/
│   ├── test/
│   │   └── setup.ts                              # NEW — Test setup (@testing-library/jest-dom)
│   ├── app/
│   │   ├── globals.css                           # MODIFIED — Dark mode CSS variables
│   │   ├── layout.tsx                            # MODIFIED — suppressHydrationWarning
│   │   ├── direction/page.tsx                    # MODIFIED — Title Variant Generator UI
│   │   ├── cv/page.tsx                           # MODIFIED — Keyword Mapper + error states
│   │   ├── jobs/page.tsx                         # MODIFIED — Non-Negotiable Filter + naturalness
│   │   ├── networking/page.tsx                   # MODIFIED — Naturalness indicators
│   │   ├── tracker/page.tsx                      # MODIFIED — DnD Kanban
│   │   └── api/
│   │       ├── health/route.ts                   # NEW — Health check endpoint
│   │       ├── direction/title-variants/route.ts # NEW — Title variant generation
│   │       ├── cover-letter/generate/route.ts    # MODIFIED — Naturalness check
│   │       ├── cv/analyze/route.ts               # MODIFIED — PDF improvements + AIError
│   │       ├── jobs/analyze/route.ts             # MODIFIED — Non-negotiables passthrough
│   │       ├── linkedin/check/route.ts           # MODIFIED — Keyword analysis
│   │       ├── networking/outreach/route.ts      # MODIFIED — Naturalness check
│   │       ├── network/startup-outreach/route.ts # MODIFIED — Naturalness check
│   │       └── network/follow-up/route.ts        # MODIFIED — Naturalness check
│   ├── components/
│   │   ├── providers.tsx                         # MODIFIED — ThemeProvider
│   │   ├── top-nav.tsx                           # MODIFIED — Theme toggle button
│   │   └── dashboard/GlassCard.tsx               # MODIFIED — CSS class for dark mode
│   └── lib/
│       ├── ai.ts                                 # MODIFIED — AIError class + error handling
│       ├── ai/
│       │   ├── mentor-engine.ts                  # MODIFIED — AIError handling
│       │   ├── naturalness-check.ts              # NEW — Rule-based naturalness checker
│       │   └── __tests__/
│       │       └── naturalness-check.test.ts     # NEW — 11 tests
│       ├── db/                                   # NEW — Supabase data access layer
│       │   ├── index.ts                          # Barrel re-export
│       │   ├── profiles.ts                       # User profiles CRUD
│       │   ├── cvs.ts                            # CV storage + analysis
│       │   ├── applications.ts                   # Application tracking CRUD
│       │   ├── contacts.ts                       # Contact management
│       │   ├── stories.ts                        # STAR stories
│       │   ├── interviews.ts                     # Interview logs
│       │   └── interactions.ts                   # AI interaction history
│       ├── prompts/
│       │   ├── cv-prompts.ts                     # MODIFIED — Non-negotiable requirements
│       │   └── direction-prompts.ts              # MODIFIED — Title variant prompt
│       └── methodology/
│           └── __tests__/
│               └── methodology.test.ts           # NEW — 19 structural tests
```

---

## 8. How to Run Tests

```bash
# Interactive watch mode
npm test

# Single run (CI-friendly)
npm run test:run
```

---

*Report generated from Claude Code session on 8 April 2026. Continuation of session 1 (5 April). 22 files modified, 14 new files created, +796 net lines of code, 30 tests added.*
