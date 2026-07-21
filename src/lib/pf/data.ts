/**
 * PathFinder redesign — static content extracted from the Claude Design
 * handoff (PathFinder App.dc.html). Single source of truth for seed data,
 * copy and reference tables used across the app pages.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export interface BoardCard {
  key: string;
  company: string;
  role: string;
  tag: string;
  tone: string; // css var token, e.g. "var(--strong)"
  when: string;
  match: number;
  note: string;
  rejected?: boolean;
  appliedDate?: number;
  remind?: string; // yyyy-mm-dd
}

export interface BoardColumn {
  id: "saved" | "applied" | "interview" | "offer" | "rejected";
  title: string;
  tone: string;
  cards: BoardCard[];
}

export interface StaticJob {
  company: string;
  role: string;
  meta: string;
  fit: number;
  dash: number;
  tone: string;
  tags: string[];
  verdict: string;
  action: string;
  jdText?: string;
}

export interface JobDetail {
  chips: [string, string][];
  desc: string[];
  resp: string[];
  reqs: [string, boolean][];
}

/* ── Tracker board seed ────────────────────────────────────────────── */

export const BOARD_SEED: BoardColumn[] = [
  {
    id: "saved", title: "Saved", tone: "var(--faint)", cards: [
      { key: "vercel", company: "Vercel", role: "Frontend Intern", tag: "fit 74", tone: "var(--strong)", when: "new", match: 74, note: "Strong fit. Tailor the CV to edge/Next.js keywords before applying." },
      { key: "monzo", company: "Monzo", role: "Backend Intern", tag: "fit 66", tone: "var(--warn)", when: "new", match: 66, note: "Close the Go gap first — ship a small CLI in Go, then apply." },
    ],
  },
  {
    id: "applied", title: "Applied", tone: "var(--active)", cards: [
      { key: "skyscanner", company: "Skyscanner", role: "SWE Intern", tag: "referral", tone: "var(--active)", when: "2d ago", match: 81, note: "Referred by Priya (recruiter). Follow up Friday if no reply." },
      { key: "fanduel", company: "FanDuel", role: "Backend Intern", tag: "ATS ✓", tone: "var(--strong)", when: "5d ago", match: 73, note: "ATS-clean CV submitted. Hiring manager viewed your LinkedIn on Tuesday." },
    ],
  },
  {
    id: "interview", title: "Interview", tone: "var(--accent)", cards: [
      { key: "bedrockai", company: "BedrockAI", role: "SWE Intern", tag: "tech · Thu", tone: "var(--accent)", when: "prep now", match: 77, note: "Technical Thursday 14:00 — arrays/strings plus a systems chat. Two mediums a day until then." },
      { key: "traveltech", company: "TravelTech", role: "Full-Stack", tag: "final", tone: "var(--accent)", when: "in 1w", match: 71, note: "Final round with the CTO. Prepare two sharp questions about their roadmap." },
    ],
  },
  {
    id: "offer", title: "Offer", tone: "var(--strong)", cards: [
      { key: "pulseboard", company: "Pulseboard", role: "SWE Intern", tag: "offer", tone: "var(--strong)", when: "decide by Fri", match: 80, note: "£2,400/mo, 12 weeks, hybrid. Decision deadline Friday — you can ask for a week to decide." },
    ],
  },
  {
    id: "rejected", title: "Rejected / Ghosted", tone: "var(--risk)", cards: [
      { key: "optiver", company: "Optiver", role: "Trading Eng Intern", tag: "rejected", tone: "var(--risk)", when: "1w ago", match: 55, note: "Auto-rejection arrived 2 hours after applying.", rejected: true },
      { key: "palantir", company: "Palantir", role: "FDSE Intern", tag: "ghosted", tone: "var(--faint)", when: "3w ago", match: 61, note: "No reply after 3 weeks and one follow-up.", rejected: true },
    ],
  },
];

/** The real starting board for a new user: the five columns, no cards.
 *  BOARD_SEED is demo content only (Storybook/design reference). */
export const EMPTY_BOARD: BoardColumn[] = BOARD_SEED.map((col) => ({ ...col, cards: [] }));

/* ── CV analysis reference tables ──────────────────────────────────── */

export const VAGUE_TERMS: [string, string][] = [
  ["responsible for", "Own the verb: “Built…”, “Shipped…”, “Led…”"],
  ["helped", "Say exactly what you did, with a number"],
  ["worked on", "Name the artefact you produced"],
  ["assisted", "Claim your slice: “Implemented X within Y”"],
  ["various", "List the two that mattered"],
  ["involved in", "State your role and the outcome"],
];

export const KEYWORD_VOCAB = [
  "React", "TypeScript", "JavaScript", "Next.js", "Node", "Express", "Python", "Go", "Java", "C++",
  "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes", "GraphQL", "REST", "CI/CD", "Testing", "Git", "Linux",
];

export const DEFAULT_TARGET_KEYWORDS = ["React", "TypeScript", "Node", "SQL"];

export const ATS_CHECKS = [
  { label: "Single-column, no tables or text boxes", mark: "✓", bg: "var(--strong)", note: "pass", noteColor: "var(--strong)" },
  { label: "Standard section headings", mark: "✓", bg: "var(--strong)", note: "pass", noteColor: "var(--strong)" },
  { label: "No icons, graphics or photos", mark: "✓", bg: "var(--strong)", note: "pass", noteColor: "var(--strong)" },
  { label: "Role keywords in top third", mark: "!", bg: "var(--warn)", note: "4 missing", noteColor: "var(--warn)" },
  { label: "Every bullet quantified", mark: "!", bg: "var(--warn)", note: "5 of 11", noteColor: "var(--warn)" },
  { label: "File named Firstname_Lastname_CV.pdf", mark: "✕", bg: "var(--risk)", note: "rename", noteColor: "var(--risk)" },
];

export const CV_LINES = [
  { tag: "Quantify", tagColor: "var(--warn)", reason: "No measurable result — add scale or impact", before: "Built a web app for tracking tasks using React.", after: "Shipped a React task-tracker used by 40+ classmates, cutting planning time ~30%." },
  { tag: "Keyword", tagColor: "var(--accent)", reason: "Missing target-role keywords (Node, Postgres, REST)", before: "Made the backend and connected a database.", after: "Built a Node/Express REST API backed by PostgreSQL, serving 12 endpoints." },
  { tag: "Verb", tagColor: "var(--active)", reason: "Weak opener — lead with an action verb", before: "Was responsible for helping fix bugs.", after: "Resolved 30+ triaged issues, raising test coverage from 48% to 76%." },
];

export const CV_MATCH = [
  { role: "Full-Stack Engineer Intern", pct: "81%", score: 81, tone: "var(--strong)" },
  { role: "Frontend Engineer Intern", pct: "73%", score: 73, tone: "var(--strong)" },
  { role: "Data / ML Engineer Intern", pct: "54%", score: 54, tone: "var(--warn)" },
];

export const PROJECT_IDEAS = [
  { name: "Distributed rate-limiter service", stack: "Go or Node · Redis · Docker", features: "Token-bucket algorithm, per-client quotas, metrics endpoint, load-tested to 5k rps.", talk: "Why token bucket over sliding window; how you measured p99 latency under load." },
  { name: "Realtime collaborative task board", stack: "React · WebSockets · PostgreSQL", features: "Optimistic updates, presence cursors, conflict resolution, deployed with CI.", talk: "The consistency trade-off you chose and the race condition you actually fixed." },
];

/* ── Direction ─────────────────────────────────────────────────────── */

export const DIR_ROLE_OPTS = ["Full-Stack SWE", "Frontend", "Backend", "Data / ML"];
export const DIR_STACK_OPTS = ["React", "TypeScript", "Node", "Python", "Go", "SQL", "AWS"];
export const DIR_INDUSTRY_OPTS = ["Fintech", "Travel Tech", "Dev Tools", "Healthtech", "Open"];
export const DIR_SIZE_OPTS = ["Startups 0–50", "Scaleups", "Big Tech"];
export const DIR_SETTING_OPTS = ["Remote", "Hybrid", "On-site"];

export const TITLE_VARIANTS: Record<string, string[]> = {
  "Full-Stack SWE": ["Software Engineer Intern", "Full-Stack Developer Intern", "Web Application Engineer Intern", "Product Engineer Intern"],
  "Frontend": ["Frontend Engineer Intern", "UI Engineer Intern", "Web Developer Intern", "Design Engineer Intern"],
  "Backend": ["Backend Engineer Intern", "Platform Engineer Intern", "API Engineer Intern", "Infrastructure Intern"],
  "Data / ML": ["Data Science Intern", "Machine Learning Intern", "Data Engineer Intern", "AI Engineer Intern"],
};

export const CHAT_REPLIES = [
  "Noted. What kind of problems pull you in — interfaces people touch, data and models, or the systems underneath?",
  "Good signal. Small startup where you wear every hat, or somewhere bigger with more structure and mentorship?",
  "That’s enough to draft a direction. I’ve pre-filled the wizard from what you said — accept it below or keep refining.",
];

export const TARGET_ROLES = [
  { fit: 86, title: "Full-Stack Engineer Intern", note: "React / Node / Postgres — your core stack", tone: "var(--strong)", label: "primary" },
  { fit: 74, title: "Frontend Engineer Intern", note: "TypeScript + design-system work", tone: "var(--strong)", label: "strong" },
  { fit: 61, title: "Data / ML Engineer Intern", note: "Needs a shipped ML project first", tone: "var(--warn)", label: "stretch" },
];

export const HIRE_FRAMEWORK = [
  { k: "H", label: "Hone direction", note: "Direction statement + 3 target roles", status: "Done", statusColor: "var(--strong)", bg: "var(--strong)", fg: "#fff" },
  { k: "I", label: "Intensify profile", note: "CV, LinkedIn, GitHub aligned", status: "In progress", statusColor: "var(--warn)", bg: "var(--warn)", fg: "#fff" },
  { k: "R", label: "Raise reach", note: "Warm paths into target tiers", status: "Next", statusColor: "var(--faint)", bg: "var(--panel3)", fg: "var(--muted)" },
  { k: "E", label: "Excel in interviews", note: "STAR + technical patterns", status: "Later", statusColor: "var(--faint)", bg: "var(--panel3)", fg: "var(--muted)" },
];

/* ── Command Centre ────────────────────────────────────────────────── */

export const INTEL_FACTORS = [
  { label: "Academic alignment", value: 78, pct: "78%", color: "var(--strong)" },
  { label: "Technical skills", value: 71, pct: "71%", color: "var(--strong)" },
  { label: "Portfolio strength", value: 64, pct: "64%", color: "var(--warn)" },
  { label: "Industry experience", value: 52, pct: "52%", color: "var(--warn)" },
];

export const INTEL_MOVES = [
  { n: "01", action: "Tailor & apply to Skyscanner", why: "Highest fit (86) with 6 alumni inside — best odds available today.", impact: "act now", color: "var(--strong)", href: "/jobs" },
  { n: "02", action: "Open a warm path to a target", why: "Zero referrals logged — referrals convert ~4× cold applications.", impact: "4× odds", color: "var(--accent)", href: "/networking" },
  { n: "03", action: "Raise ATS readiness on reach targets", why: "2 roles are filtered by ATS before a human reads your CV.", impact: "+14%", color: "var(--warn)", href: "/cv" },
];

export const INTEL_STATS = [
  { label: "Strong matches", value: "3", note: "≥ 60 fit", color: "var(--strong)" },
  { label: "Reach targets", value: "2", note: "build prereqs", color: "var(--risk)" },
  { label: "Warm paths", value: "1", note: "intro ready", color: "var(--active)" },
  { label: "Active pipeline", value: "12", note: "applications", color: "var(--fg)" },
];

export const OPPORTUNITY_MATRIX = [
  { company: "Skyscanner", role: "SWE Intern", fit: 86, fitpct: "86%", tone: "var(--strong)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+8 / 30d", warmText: "● intro", warmColor: "var(--active)", move: "Tailor & apply" },
  { company: "FanDuel", role: "Backend Intern", fit: 79, fitpct: "79%", tone: "var(--strong)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+3 / 30d", warmText: "—", warmColor: "var(--faint)", move: "Tailor & apply" },
  { company: "Vercel", role: "Frontend Intern", fit: 74, fitpct: "74%", tone: "var(--strong)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+4 / 30d", warmText: "—", warmColor: "var(--faint)", move: "Tailor & apply" },
  { company: "Monzo", role: "Backend Intern", fit: 66, fitpct: "66%", tone: "var(--warn)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+5 / 30d", warmText: "—", warmColor: "var(--faint)", move: "Tailor CV hard" },
  { company: "Stripe", role: "SWE Intern", fit: 58, fitpct: "58%", tone: "var(--warn)", sigarrow: "→", sigcolor: "var(--muted)", trend: "steady", warmText: "—", warmColor: "var(--faint)", move: "Tailor CV hard" },
  { company: "Databricks", role: "SWE Intern", fit: 34, fitpct: "34%", tone: "var(--risk)", sigarrow: "→", sigcolor: "var(--muted)", trend: "steady", warmText: "—", warmColor: "var(--faint)", move: "Build prereq" },
];

/* ── Jobs ──────────────────────────────────────────────────────────── */

export const STATIC_JOBS: StaticJob[] = [
  { company: "Skyscanner", role: "Software Engineer Intern", meta: "Edinburgh · 900+ · Summer 2026", fit: 86, dash: 20, tone: "var(--strong)", tags: ["React", "TypeScript", "Alumni ×6"], verdict: "Strong match — apply now", action: "Tailor CV" },
  { company: "FanDuel", role: "Backend Engineer Intern", meta: "Edinburgh · 500+ · 12 wks", fit: 79, dash: 30, tone: "var(--strong)", tags: ["Node", "Go", "Postgres"], verdict: "Strong match", action: "Tailor CV" },
  { company: "Vercel", role: "Frontend Engineer Intern", meta: "Remote · 400+ · Summer", fit: 74, dash: 37, tone: "var(--strong)", tags: ["Next.js", "React", "Edge"], verdict: "Good match", action: "Tailor CV" },
  { company: "Monzo", role: "Backend Engineer Intern", meta: "London · 3000+ · Summer", fit: 66, dash: 49, tone: "var(--warn)", tags: ["Go", "gRPC", "AWS"], verdict: "Reach — close Go gap", action: "Build prereq" },
  { company: "Stripe", role: "Software Engineer Intern", meta: "London · 8000+ · Summer", fit: 58, dash: 60, tone: "var(--warn)", tags: ["Ruby", "Scale", "ATS-hard"], verdict: "Reach — tailor hard", action: "Tailor CV" },
  { company: "Databricks", role: "Software Engineer Intern", meta: "Remote · 6000+ · Summer", fit: 34, dash: 95, tone: "var(--risk)", tags: ["Scala", "Spark", "ML"], verdict: "Long shot — build first", action: "Skill up" },
];

export const JOB_DETAILS: Record<string, JobDetail> = {
  Skyscanner: {
    chips: [["NEW this week", "var(--accent)"], ["Apply by 28 Jul", "var(--warn)"], ["Visa sponsorship", "var(--active)"], ["Yr 2–3", "var(--muted)"], ["Company careers · 3d ago", "var(--faint)"]],
    desc: ["Build features on the flights-search web app used by 100M+ travellers a month. You will ship production React and TypeScript inside a product squad, pairing with senior engineers from day one.", "Twelve weeks, paid, based in the Edinburgh office — with a real ownership area and an intern demo day at the end."],
    resp: ["Ship user-facing features in React/TypeScript on the flights web app", "Write and maintain tests (Jest, Playwright) for everything you ship", "Take part in code review, standups and sprint planning", "Present your ownership area at intern demo day"],
    reqs: [["React + TypeScript project experience", true], ["JavaScript fundamentals & the event loop", true], ["Testing experience (Jest or similar)", true], ["CI/CD familiarity", false]],
  },
  FanDuel: {
    chips: [["Apply by 15 Aug", "var(--warn)"], ["No sponsorship", "var(--muted)"], ["Yr 2–4", "var(--muted)"], ["Grad board · 1w ago", "var(--faint)"]],
    desc: ["Join the betting-platform backend group in Edinburgh, building the services that settle millions of wagers a day. Interns own a service improvement end-to-end.", "Twelve weeks, paid, with a dedicated mentor and a rotation through incident response."],
    resp: ["Build and ship an improvement to a production Node or Go service", "Instrument your service with metrics and alerts", "Shadow an on-call rotation with your mentor", "Write a design doc and defend it in review"],
    reqs: [["Node.js and REST API experience", true], ["SQL / PostgreSQL", true], ["Go (any exposure)", false], ["Distributed-systems basics", false]],
  },
  Vercel: {
    chips: [["NEW this week", "var(--accent)"], ["Rolling deadline", "var(--strong)"], ["Remote — UK eligible", "var(--active)"], ["Company careers · 2d ago", "var(--faint)"]],
    desc: ["Work on the framework-and-dashboard experience used by millions of developers. The intern project ships to production — previous interns built features still in the product today.", "Fully remote with a London meetup cadence; strong async writing culture."],
    resp: ["Ship a dashboard feature in Next.js + React end-to-end", "Contribute to an open-source repo maintained by the team", "Write public-facing docs for what you build", "Demo at the all-hands"],
    reqs: [["Next.js / React depth", true], ["TypeScript", true], ["Open-source contributions", false], ["Edge/CDN concepts", false]],
  },
  Monzo: {
    chips: [["Apply by 01 Aug", "var(--warn)"], ["Visa sponsorship", "var(--active)"], ["Yr 2–3", "var(--muted)"], ["Grad board · 5d ago", "var(--faint)"]],
    desc: ["Backend engineering on the core banking platform — 3,000+ microservices in Go. Interns join a squad and ship to production in their first fortnight.", "Twelve weeks in London, paid, with a £1k learning budget."],
    resp: ["Ship changes to production Go microservices", "Work with gRPC service contracts and Cassandra", "Participate in squad rituals and weekly demos", "Complete the backend engineering bootcamp week 1"],
    reqs: [["Go", false], ["gRPC / service architecture", false], ["SQL and data modelling", true], ["Linux / CLI comfort", true]],
  },
  Stripe: {
    chips: [["Closing soon — 22 Jul", "var(--risk)"], ["Visa sponsorship", "var(--active)"], ["Yr 2–4", "var(--muted)"], ["Company careers · 2w ago", "var(--faint)"]],
    desc: ["Work on the APIs that move money for millions of businesses. Intern projects are scoped to ship — payments infrastructure, developer tooling, or dashboard surfaces.", "Twelve weeks in London with a dedicated intern manager and a published intern-project blog."],
    resp: ["Ship a scoped project on a production API surface", "Write API design docs reviewed by senior engineers", "Build with Ruby and TypeScript in a large codebase", "Present your project at the end-of-summer review"],
    reqs: [["API design instincts", true], ["TypeScript", true], ["Ruby", false], ["Working at scale (large codebase)", false]],
  },
  Databricks: {
    chips: [["Opens Sep 2026", "var(--muted)"], ["Visa sponsorship", "var(--active)"], ["Penultimate yr", "var(--muted)"], ["Company careers", "var(--faint)"]],
    desc: ["Distributed-data infrastructure at serious scale — Spark, Delta Lake, and the lakehouse platform. One of the hardest internships to land; prerequisites matter.", "Remote-friendly with a Amsterdam/London hub option. Applications open in September for Summer 2027."],
    resp: ["Contribute to a distributed-systems component", "Benchmark and optimise a data-path hot spot", "Work in Scala/JVM internals with a mentor", "Write up findings as an internal tech note"],
    reqs: [["Distributed systems coursework or project", false], ["Scala or JVM depth", false], ["Spark / data engineering", false], ["Strong algorithms", true]],
  },
};

/* ── Networking ────────────────────────────────────────────────────── */

export interface OutreachMessage {
  to: string;
  subject: string;
  p1: string;
  p2: string;
  close: string;
}

export const OUTREACH_PERSONAS = ["Recruiter", "Hiring manager", "Peer / alumnus", "Startup founder"] as const;
export type OutreachPersona = (typeof OUTREACH_PERSONAS)[number];

export const OUTREACH_MESSAGES: Record<OutreachPersona, OutreachMessage> = {
  "Recruiter": { to: "Priya · Recruiter, Skyscanner", subject: "CS student — quick question on your SWE intern track", p1: "Hi Priya, I’m a CS student focused on full-stack work (React/Node). I saw Skyscanner’s summer SWE internship and loved your post on the team’s move to edge rendering.", p2: "I recently shipped a deployed task-tracker my classmates use daily and would value 15 minutes to learn what a strong intern application looks like to your team — no ask beyond that.", close: "Either way, thanks for the content — it’s genuinely useful. [Your name]" },
  "Hiring manager": { to: "Marc · Engineering Manager, FanDuel", subject: "A question about your settlement-services post", p1: "Hi Marc, your write-up on rebuilding FanDuel’s settlement pipeline stuck with me — the idempotency-key section especially. I’m a CS student working in Node and Postgres.", p2: "I rebuilt a small payments-style flow in a recent project and hit the exact double-write problem you described. If your team takes interns this summer, I’d love to know what you look for.", close: "One sharp question, not a pitch: how do you test that pipeline under partial failure? [Your name]" },
  "Peer / alumnus": { to: "Tom · SWE, Monzo", subject: "Fellow CS student — coffee chat?", p1: "Hi Tom, I’m a CS student aiming at backend internships, and Monzo is top of my list.", p2: "Could I buy you a virtual coffee for 15 minutes? I’d love to hear what the intern experience is actually like — and what you wish you’d known applying.", close: "No agenda beyond that. Happy to work around your week. [Your name]" },
  "Startup founder": { to: "Sara · Founder, BedrockAI", subject: "I built something with your API — and a question", p1: "Hi Sara, I’m a CS student. Last month I built a small tool on BedrockAI’s API — a study-notes summariser my flatmates now use daily.", p2: "I’m looking for a summer internship where I’d ship real product. If you’re taking anyone on, I’d love to show you what I built and where your docs tripped me up (fixable in an afternoon).", close: "Either way — the API is genuinely great. [Your name]" },
};

export const NETWORK_PERSONA_ANGLES = [
  { kind: "Recruiter", tone: "var(--active)", title: "Speed & keywords", angle: "Wants fast signal that you match the req. Lead with stack + a quantified win." },
  { kind: "Hiring manager", tone: "var(--accent)", title: "Judgement & fit", angle: "Wants to see how you think. Reference their team’s real work, ask one sharp question." },
  { kind: "Peer / alumnus", tone: "var(--strong)", title: "Warmth & referral", angle: "Shared background or alumni path. Ask for a coffee chat, never a job — the referral follows." },
];

export const FOLLOW_UP_CADENCE = [
  { n: "1", label: "Thank-you", note: "Within 24h of any reply or chat", bg: "var(--strong)", fg: "#fff" },
  { n: "2", label: "Action proof", note: "Did the thing they suggested? Show it.", bg: "var(--warn)", fg: "#fff" },
  { n: "3", label: "Value-add", note: "Share something useful, no ask", bg: "var(--panel3)", fg: "var(--muted)" },
  { n: "4", label: "Long-term reminder", note: "Light check-in ~6 weeks later", bg: "var(--panel3)", fg: "var(--muted)" },
];

export const COFFEE_CHAT_FRAMEWORK = [
  { n: "1", label: "Opening", time: "~1 min", note: "Intro + gratitude + set a light agenda — setting the agenda reads as leadership.", script: "Would it be OK to spend most of the time on your path into the team, and grab any advice for my next year at the end?" },
  { n: "2", label: "Their story", time: "10–15 min", note: "Your prepared questions — about them, never “what should I do”.", script: "What actually separated strong interns from average ones on your team?" },
  { n: "3", label: "Positioning", time: "2–3 min", note: "Mirror their language, then map one concrete thing of yours onto it.", script: "That retrieval problem is close to what I hit building PathFinder’s RAG pipeline — I used pgvector." },
  { n: "4", label: "Closing", time: "2 min", note: "One takeaway + continued interest + agree the follow-up channel. The indirect close:", script: "What would you focus on over the next six months, in my position?" },
];

/* ── Interview ─────────────────────────────────────────────────────── */

export const IV_TABS: [string, string][] = [["leetcode", "LeetCode"], ["star", "STAR"], ["questions", "Questions"], ["briefing", "Briefing"], ["feedback", "Feedback"]];

/** [name, total, defaultSolved] */
export const LEETCODE_PATTERNS: [string, number, number][] = [
  ["Two Pointers", 10, 9],
  ["Sliding Window", 10, 8],
  ["BFS / DFS", 10, 7],
  ["Dynamic Programming", 10, 4],
  ["Graphs", 15, 5],
];

export const LEETCODE_BASE_SOLVED = 19;

export const INTERVIEW_QUESTIONS = [
  { type: "BEHAVIOURAL", tone: "var(--accent)", q: "Tell me about a time you disagreed with a teammate.", a: "Use your PR-review STAR story — conflict, the process you proposed, and the measurable calm that followed." },
  { type: "TECHNICAL", tone: "var(--active)", q: "Walk me through the JavaScript event loop.", a: "Call stack → microtask queue → macrotasks. Tie it to the real render bug you fixed with queueMicrotask." },
  { type: "ROLE", tone: "var(--strong)", q: "Why this company?", a: "Reference their edge-rendering blog post and your deployed project — the overlap is your answer." },
];

export const STAR_STORY = [
  { k: "S", label: "Situation", text: "Group project; a teammate kept pushing untested code that broke our build." },
  { k: "T", label: "Task", text: "Keep the team shipping without escalating into conflict." },
  { k: "A", label: "Action", text: "Proposed a lightweight PR review + CI check; paired with them on the first two." },
  { k: "R", label: "Result", text: "Build breakages dropped to near-zero; we shipped on time and they adopted the flow." },
];

export const COMPANY_BRIEFING = [
  { label: "What they do", text: "Travel metasearch; heavy React front end, microservices moving to edge rendering." },
  { label: "Likely questions", text: "JS event loop, a medium array/string problem, a \"why Skyscanner\" behavioural." },
  { label: "Your angle", text: "Lead with your deployed full-stack project; mention their edge-rendering post." },
];

/* ── Tracker ───────────────────────────────────────────────────────── */

export const REJECTION_DIAGNOSIS: Record<string, string> = {
  "Within hours": "ATS keyword rejection — your CV never reached a human. Fix keywords before the next application.",
  "1–2 days": "A human read it and passed — positioning or seniority mismatch. Sharpen the top third of your CV.",
  "1–2 weeks": "Likely lost to a stronger shortlist, or the role closed. Not a CV signal.",
  "Never": "Ghosted — follow up once on LinkedIn, then move on. Open a warm path next time.",
};

export const DIAG_TIMINGS = ["Within hours", "1–2 days", "1–2 weeks", "Never"];

/* ── Onboarding (Stage 00) ─────────────────────────────────────────── */

export const ONB_ROLE_OPTS = ["Software Engineering", "Data / ML", "Product", "Design"];
export const ONB_INDUSTRY_OPTS = ["Fintech", "Travel Tech", "Developer Tools", "Healthtech"];
export const ONB_STAGE_OPTS = ["Seed–Series B startups", "Growth-stage scaleups", "Big Tech"];
export const ONB_CV_OPTS: [string, number][] = [["Needs work", 12], ["Solid draft", 45], ["Tailored & sharp", 85]];
export const ONB_PROJ_OPTS: [string, number][] = [["Just started", 10], ["A couple built", 42], ["Shipped & deployed", 78]];
export const ONB_OUTREACH_OPTS: [string, number][] = [["Haven't started", 8], ["A few contacts", 42], ["Regular warm intros", 80]];
export const ONB_CADENCE_OPTS: [string, number][] = [["Not yet consistent", 8], ["Some weeks", 42], ["3+ / week reliably", 85]];

/**
 * Onboarding and the Direction wizard ask the same question in different
 * vocabularies. These maps carry the Stage 00 answer into the direction chips
 * so a student never re-picks a target they just chose.
 *
 * Product and Design have no Direction equivalent (that wizard only offers
 * engineering tracks), so they map to null and the student picks a role there.
 */
export const ONB_TO_DIR_ROLE: Record<string, string | null> = {
  "Software Engineering": "Full-Stack SWE",
  "Data / ML": "Data / ML",
  Product: null,
  Design: null,
};

export const ONB_TO_DIR_INDUSTRY: Record<string, string> = {
  Fintech: "Fintech",
  "Travel Tech": "Travel Tech",
  "Developer Tools": "Dev Tools",
  Healthtech: "Healthtech",
};

export const ONB_TO_DIR_SIZE: Record<string, string> = {
  "Seed–Series B startups": "Startups 0–50",
  "Growth-stage scaleups": "Scaleups",
  "Big Tech": "Big Tech",
};

/* ── Navigation / palette ──────────────────────────────────────────── */

export const SCREEN_ROUTES: [string, string][] = [
  ["Command Centre", "/intel"],
  ["Get started · onboarding", "/start"],
  ["Career Direction", "/direction"],
  ["CV Optimisation", "/cv"],
  ["Opportunity Discovery", "/jobs"],
  ["Networking", "/networking"],
  ["Interview Prep", "/interview"],
  ["Application Tracking", "/tracker"],
];

export const CRUMBS: Record<string, string> = {
  "/start": "STAGE 00 · ONBOARDING",
  "/intel": "COMMAND CENTRE · POSITION FIXED",
  "/direction": "PHASE 01 · CAREER DIRECTION",
  "/cv": "PHASE 02 · CV OPTIMISATION",
  "/jobs": "PHASE 03 · OPPORTUNITY DISCOVERY",
  "/networking": "PHASE 04 · NETWORKING",
  "/interview": "PHASE 05 · INTERVIEW PREP",
  "/tracker": "PHASE 06 · APPLICATION TRACKING",
};
