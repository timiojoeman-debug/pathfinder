# PathFinder — AI-Powered Internship Navigation

PathFinder guides university students through the entire internship process: defining career direction, optimizing their CV, discovering opportunities, networking strategically, preparing for interviews, and tracking applications.

## Features

- **Phase 1 — Career Direction** — Wizard questionnaire, direction statement, specificity score
- **Phase 2 — CV Optimizer** — Upload PDF/DOCX, AI analysis, project ideas to close skill gaps
- **Phase 3 — Job Discovery** — Manual internship entry, paste job descriptions, ATS keywords, compatibility score
- **Phase 4 — Networking** — AI outreach (recruiter, hiring manager, peer), LinkedIn/Glassdoor profile analysis
- **Phase 5 — Interview Prep** — LeetCode 75/150 tracker, STAR story builder, AI question generator
- **Phase 6 — Application Tracker** — Kanban pipeline, consistency dashboard

## Getting Started

### Prerequisites

- Node.js 20+
- OpenAI API key (for AI features)

### Setup

1. Clone and install:

```bash
cd pathfinder
npm install
```

2. Create `.env.local` with your OpenAI key:

```bash
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start with **Dashboard** → **Direction** → **CV** → **Jobs** → **Networking** → **Interview** → **Tracker**.

### Demo Without API Key

Without an OpenAI key, AI features return sensible fallbacks so you can demo the full workflow. CV parsing (PDF/DOCX) works locally; AI analysis uses mock responses.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API routes
- **Storage**: localStorage (prototype; swap for Supabase/PostgreSQL for production)
- **AI**: OpenAI GPT (configurable via env)
- **Parsing**: pdf-parse, mammoth (PDF/DOCX)

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Dashboard
│   ├── direction/        # Phase 1
│   ├── cv/               # Phase 2
│   ├── jobs/             # Phase 3
│   ├── networking/       # Phase 4
│   ├── interview/        # Phase 5
│   ├── tracker/          # Phase 6
│   └── api/              # API routes
├── components/
│   └── top-nav.tsx
└── lib/
    ├── ai.ts             # OpenAI wrapper
    └── store.ts          # localStorage helpers
```
