# PathFinder — End-to-End User Workflow & 6-Stage Breakdown

*How a user moves through the product: from first landing, to locking a direction, to watching applications flow across the tracker. Traced directly from the code — every route, API call, and stored value below is real.*

---

## 0. How to read this: the data spine

Before the stages, understand where everything lives, because the whole journey is really *"data captured on one page unlocks the next."* PathFinder currently runs entirely on **`localStorage`** (Supabase is defined but not connected), with a two-layer state model:

**Layer A — canonical store (`src/lib/store.ts`)** writes/reads these keys:

| Key | Written by | Read by |
|---|---|---|
| `pathfinder-direction` | Onboarding + Direction | Jobs (fit), CV (LinkedIn check), Networking |
| `pathfinder-cv-summary` | CV analyze | Jobs (match score), Cover letter |
| `pathfinder-internships` | Jobs "Save to list" | Jobs list |
| `pathfinder-applications` | Jobs "Add to tracker" | Tracker, Dashboard funnel |
| `pathfinder-leetcode` | Interview (LeetCode tracker) | Interview |
| `pathfinder-networking-count` | Networking (each message) | Tracker stat |
| `pathfinder-interview-feedback` | Interview (feedback log) | Interview |
| `pathfinder-onboarded` | Onboarding finish | (gate flag) |

**Layer B — reactive read-model (`useAppStore`, Zustand)** is a *mirror* of Layer A that React components subscribe to. Whenever `setApplications`, `setDirection`, or `setCvSummary` run, they write localStorage **and** push into `useAppStore` so the dashboard/headers update live. On every app load, `hydrateReadModel()` (in `providers.tsx`) copies localStorage back into the read-model so returning users see their data.

The practical consequence: **there is no server round-trip for your data.** AI endpoints are called for *analysis*, but the results are stored locally. Your `direction.score` (readiness baseline) is the single number that quietly powers fit badges, funnel projections, and win-rate bands everywhere downstream.

---

## Stage 0 — Joining & onboarding (`/start`)

**The entry point for a new user.** A 3-step wizard that produces a readiness baseline and a saved direction, then drops you into the command center.

**Step 1 · Target** — pick three chips: **Target role** (SWE, Data/ML, Frontend, Backend, Product, Quant), **Industry** (Startups, Big Tech, Fintech, Enterprise, Open), and **Stage** (First year → Recent grad). The moment role + industry are set, a live **Direction Statement** is composed: *"I'm targeting {role} internships at {industry}."*

**Step 2 · Position** — four honest self-assessments, each mapping to a 0–100 pillar coverage:
- CV state (12 / 45 / 85)
- Portfolio projects (10 / 42 / 78)
- Networking & outreach (8 / 42 / 80)
- Application cadence (8 / 42 / 85)

**"Analyze readiness →"** triggers a ~1.7s scan interstitial ("Analyzing across the Four Pillars"), then Step 3.

**Step 3 · Baseline** — computes a weighted **readiness score** using the Four Pillars weights from the Career-OS methodology:

```
readiness = clarity·0.10 + positioning·0.30 + networking·0.35 + consistency·0.25
```

(clarity is seeded high at 82 because you just defined a direction; networking = average of the projects + outreach reads.) You get:
- A **ReadinessRing** (e.g. "You're 54% internship-ready")
- A **projected interview rate** band — Early stage 3–6% / Competitive 8–14% / Strong 18–28% / Top decile 30%+
- **Four Pillars bars** showing your starting position
- **Biggest gaps detected** (any pillar < 60, ranked worst-first)
- **Your first move** — the single lowest-coverage action, linking to `/cv`, `/networking`, or `/jobs`

**"Enter command center →"** calls `finish()`, which `saveDirection({ statement, score, roleType, industry })`, sets the `pathfinder-onboarded` flag, and routes to **`/intel`**.

> Note: onboarding isn't hard-gated — the top nav and phase pages are reachable directly — but `/start` is the intended front door and the only place the readiness `score` is first written.

---

## The hub: command center (`/intel`) + navigation

After onboarding you land on the **Intel console** — a cross-phase readiness dashboard with "lenses" (overview / direction / cv / discovery / networking / interview / pipeline) that re-weight your score and surface the next best move. From here, the persistent **top nav** exposes the six stages in order:

**Direction → CV → Jobs → Networking → Interview → Tracker** (with an Intel/⌘K command palette).

Each phase page carries a **PhaseHeader** with live "signals" (small stat chips) so you always see progress — e.g. Jobs shows "Tracked roles" and "Match score"; Tracker shows "Active apps" and "This week 2/3".

---

## Stage 1 — Direction (`/direction`) · Phase 1

**Goal:** lock a specific target so every downstream decision has a yardstick. Two modes via a toggle:

### Wizard mode (structured)
- **Step 1:** choose one **Target role** + multi-select **tech stack** chips.
- **Step 2:** **Industry, Company size** (Startup 0–50 / Scaleup / Big Tech), **Country → City** (city list depends on country), **Work setting** (remote/hybrid/onsite).
- **"Generate statement"** → `POST /api/direction` → returns `{ statement, specificity, suggestions[] }`. The form is persisted via `setDirection(...)` and Step 3 renders:
  - The **Career focus statement** + a **specificity** tag
  - **"How to sharpen it further"** suggestions
  - **Search With These Job Titles** — auto-fires `POST /api/direction/title-variants` to produce clickable, copy-to-clipboard title variants ("the same role is posted under different names") so you don't miss listings in Stage 3.

### Explore mode (conversational)
A chat UI. Each message → `POST /api/direction/explore`, which returns a reply plus **`extractedPreferences`** (role, industry, techStack, location), a **`readyForStatement`** flag, and a **`suggestedStatement`**. When ready, a banner offers **"Accept this direction"** → `setDirection(...)`.

**Both modes end with a "Next phase: CV Optimizer →" link.** The written `pathfinder-direction` now feeds: Jobs fit badges, the LinkedIn check, and Networking defaults.

---

## Stage 2 — CV Optimizer (`/cv`) · Phase 2

**Goal:** make the CV pass ATS + the 6-second human scan, and turn gaps into projects.

- **Input:** drag-drop / upload **PDF, DOC, DOCX, TXT** (≤10MB) *or* paste text.
- **"Analyze CV"** → `POST /api/cv/analyze` (multipart). Returns structured `{ education, experience, projects, skills, suggestions{ bulletPoints, keywords, formatting, extraQualifications } }`. Robust error states are handled: extraction-failed (→ "paste instead"), AI-unavailable (missing `OPENAI_API_KEY`), and retryable network errors.
- **Critically:** on success it builds a compact **CV summary** string and calls `setCvSummary(...)` → persisted to `pathfinder-cv-summary` **and** mirrored into the store. *This is the value Stage 3's match scoring reads.*

**Outputs on the page:**
- **ATS match score** (derived: `100 − min(60, keywords·5)`, default 72) with an animated bar
- **Missing keywords** chips
- **Formatting tips** and **bullet-point improvements** (rewritten, impact-style)
- **Vague terms detected** — a *client-side* scan of the CV preview against `CV_BLUEPRINT.vagueTerms`, each with a suggested rewrite
- **Generate project ideas** → `POST /api/cv/projects` (passes your skills + keyword gaps + target role) → project cards with tech stack, key features, and **interview talking points** — closing skill gaps per the methodology
- **LinkedIn Quick Check** (collapsible) → `POST /api/linkedin/check` using your saved direction → profile score, headline/about sub-scores, severity-tagged issues, and **recruiter keyword coverage**

**"Next phase" leads to Jobs.**

---

## Stage 3 — Jobs / Internships (`/jobs`) · Phase 3 — *the tracker handoff happens here*

**Goal:** capture roles, score fit, and push chosen ones into the pipeline.

**Add & store:** a form (job title, company, job description, job URL, optional LinkedIn URL/paste). Two actions:
- **"Save to my list"** → `addInternship(...)` → `pathfinder-internships`. Each saved card shows a **FitBadge** — `roleFit(baseline, jobDescription)`, an instant estimate from your readiness `score` + the role's seniority signals (no AI call).
- **"Analyze & get ATS keywords"** → `POST /api/jobs/analyze` with `{ jobTitle, company, jobDescription, cvSummary, linkedin }`.

**Analysis panel returns and renders:**
- **Compatibility score** /100 (CV vs job requirements — this is why Stage 2 matters)
- **Non-negotiable filter** — dealbreaker requirements (visa, clearance, degree, YOE) each marked ✅/❌ with `hasBlockers` + a `blockerWarning`
- **ATS keyword table** — each required keyword: found-in-CV ✓/✗, suggested section, action needed, plus an "X / Y matched" tally
- **ATS pre-submission audit** checklist
- **Visa sponsorship** reminder card (links to the UK licensed-sponsor register)
- **Cover letter generator** → `POST /api/cover-letter/generate` → letter + **assumptions to review** + word count + an **AI-naturalness verdict** (natural → heavily_ai, with fix suggestions)

**➡️ The pivotal moment — "Add to tracker":** `addToTracker()` reads `pathfinder-applications`, appends a new record `{ id, jobTitle, company, source:"Manual", matchScore, stage:"researching", jobUrl, jobDescription, atsKeywords }`, and writes it back. A **"View tracker →"** link sits right beside it. *This is the single bridge from Stage 3 to Stage 6.*

---

## Stage 4 — Networking (`/networking`) · Phase 4

**Goal:** generate targeted outreach and manage the relationship cadence. (Optional in the linear path, but it feeds a tracker stat and its own pipeline stage.)

- **Outreach type** selector: recruiter / hiring manager / peer / **startup founder** (the Hiring Pyramid personas).
- **Generate outreach** → `POST /api/networking/outreach` → a message + suggested questions + conversation topics + a follow-up line, each with a **naturalness** check. Every generated message increments **`pathfinder-networking-count`** (surfaced as "Networking sent" on the tracker).
- **Analyze a profile** → `POST /api/networking/analyze-profile` → summary, connection points, outreach angles, conversation starters.
- **The 4-step follow-up cadence** is shown (Thank-you 24h → Action proof 4–10d → Value-add 10–15d → Long-term 15d+), with:
  - **Follow-up generator** → `POST /api/network/follow-up`
  - **Referral package** (forwardable message) → `POST /api/network/referral-package`
  - **Startup cold outreach** → `POST /api/network/startup-outreach`

---

## Stage 5 — Interview Prep (`/interview`) · Phase 5

**Goal:** convert interviews into offers. Five tabs:

- **LeetCode** — the **NeetCode 75 / 150** trackers by category; checking a problem persists to `pathfinder-leetcode` (counts + completed lists). Each row links to LeetCode + NeetCode. (Also backed by `/api/interview/random-problem` and `/api/interview/rate-solution`.)
- **STAR** — behavioural story builder → `POST /api/interview/star-builder`, with `POST /api/interview/star-tweak` for refinement; tutorial links included.
- **Questions** — role-tailored question generation → `POST /api/interview/questions` (type + question + answer template).
- **Briefing** — company briefing → `POST /api/interview/company-briefing`.
- **Feedback** — a post-interview reflection log stored in `pathfinder-interview-feedback` (company, role, date, questions, ratings for technical/behavioural/communication, reflections), with `POST /api/interview/feedback` for AI analysis.

---

## Stage 6 — Application Tracker (`/tracker`) · Phase 6 — *the destination*

**Goal:** run the pipeline as a consistency engine and diagnose leaks. Reads `pathfinder-applications` (everything you added in Stage 3).

**Layout, top to bottom:**
1. **Weekly application counter** — target **3/week**. Progress bar changes color; warns if you've sent **>5** ("slow down, quality over quantity") or **0 by Thursday** ("apply to at least one today"). "This week" is computed from each card's `appliedDate`.
2. **Stat tiles** — Applications · **Networking sent** (from Stage 4's count) · Interviews · Offers.
3. **Funnel panel** — submitted → interviews → offers, with computed **interview rate** and **offer rate**, a **projected rate** from your readiness baseline, and an automatic **leak diagnosis** that deep-links to the fix: too few submissions → "keep cadence"; interview rate < 10% → **"Fix your CV" (→ /cv)**; offers lagging → **"Prep interviews" (→ /interview)**.
4. **The pipeline board** — 8 stages as rows: **Researching → Tailoring → Applied → Networking → Interviewing → Offer → Rejected → Ghosted**.

**Interactions (all persist via `setApplications`, which also mirrors to the dashboard):**
- **Drag-and-drop** cards between stages (`@hello-pangea/dnd`); moving to **Applied** auto-stamps `appliedDate` (which drives the weekly counter).
- Per-card **stage dropdown**, **reminder date**, reorder ↑/↓, remove (with an "Are you sure?" confirm), and an "Open" link to the job URL.
- **Rejection diagnosis:** on a Rejected/Ghosted card, **"Diagnose"** asks *when* you heard back → maps timing to a cause (within hours = ATS keywords; 1–2 days = positioning/seniority; 2+ weeks = role closed; never = follow up on LinkedIn).
- **Pattern insight:** once you have ≥3 diagnosed rejections and ≥50% share one timing, a banner summarizes the systemic issue (e.g. *"67% of your rejections were 'Within hours' — check your CV keywords"*).

Empty state links back to **/jobs** to add applications.

---

## The golden path, end to end

```
/start (onboard)                → save direction + readiness score, land in /intel
  → /direction                  → POST /api/direction → statement + title variants   [writes pathfinder-direction]
  → /cv                         → POST /api/cv/analyze → ATS score + keyword gaps     [writes pathfinder-cv-summary]
  → /jobs   (paste a JD)        → "Save to list"  [writes pathfinder-internships]
            (Analyze)           → POST /api/jobs/analyze → match score + ATS table   (reads cv-summary + direction)
            ("Add to tracker")  → append record, stage="researching"                 [writes pathfinder-applications]
            ("View tracker →")  ───────────────────────────────────────────────┐
  → /networking (optional)      → POST /api/networking/outreach                 │    [bumps pathfinder-networking-count]
  → /interview  (optional)      → STAR / questions / LeetCode / feedback         │    [writes pathfinder-leetcode, -feedback]
  → /tracker  ◄─────────────────────────────────────────────────────────────────┘
            drag Researching → … → Applied (stamps appliedDate) → Interviewing → Offer
            funnel diagnoses the leak and links back to /cv or /interview
```

Everything loops: the tracker's funnel and rejection diagnosis point you *back* to the exact earlier stage that needs work — the "feedback loop" pillar made literal.

---

## Cross-stage data dependencies (why order matters)

| This stage… | …reads from | …writes for later |
|---|---|---|
| Onboarding | — | `direction` (score, statement) → everything |
| Direction | onboarding direction | `direction` (role, stack, industry, location) |
| CV | direction (LinkedIn check) | `cv-summary` → Jobs match scoring |
| Jobs | `cv-summary`, `direction.score` (fit badge) | `internships`, `applications` → Tracker |
| Networking | direction, cv-summary | `networking-count` → Tracker stat |
| Interview | direction, cv-summary | `leetcode`, `interview-feedback` |
| Tracker | `applications`, `networking-count`, `direction.score` | stage/date updates → dashboard + funnel |

---

## Caveats worth knowing

- **All local, single-device.** No account sync — data lives in the browser's `localStorage`. Clearing site data resets the journey.
- **AI is optional-degradable.** Without `OPENAI_API_KEY`, analysis endpoints surface a friendly "AI unavailable" state; the tracker, fit badges, vague-term scan, and LeetCode tracker still work (they're computed client-side).
- **No hard gating between phases.** You *can* jump straight to `/tracker`, but scores/fit will read as neutral/50 until a direction and CV exist — the order above is what makes the numbers meaningful.
- **The readiness `score` is load-bearing.** Set once in onboarding, it silently calibrates fit badges (Jobs), win-rate band (onboarding), and the projected funnel rate (Tracker). It does not yet recalculate from real outcomes — a natural next feature.
