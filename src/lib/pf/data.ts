/**
 * PathFinder redesign — static content extracted from the Claude Design
 * handoff (PathFinder App.dc.html). Single source of truth for seed data,
 * copy and reference tables used across the app pages.
 *
 * EVERY EMPLOYER HERE IS INVENTED. Northwind Travel, Fairway Sports, Edgeline,
 * Kestrel Bank, Ledgerline and Lakemont Data do not exist, and neither do the
 * deadlines, headcounts, visa terms or pay details attached to them.
 *
 * This file previously named Skyscanner, FanDuel, Vercel, Monzo, Stripe and
 * Databricks and hung fabricated specifics off them — "Apply by 28 Jul",
 * "Visa sponsorship", "3,000+ microservices in Go", "£1k learning budget" —
 * rendered to students as their live pipeline. A labelled mockup may invent
 * numbers about a hypothetical employer; it may not invent a closing date for
 * a real one, because a student can act on that and miss a real deadline or
 * chase one that was never open. Two rows also asserted third-party behaviour
 * outright: a named recruiter making a referral, and a hiring manager viewing
 * the student's LinkedIn on a given day.
 *
 * Keep employers here fictional. If real listings are wanted, they belong in
 * /api/jobs/search, which returns live Adzuna data and is already forbidden
 * from serving placeholders.
 */

/* ── Types ─────────────────────────────────────────────────────────── */

export interface BoardCard {
  key: string;
  company: string;
  role: string;
  tag: string;
  tone: string; // css var token, e.g. "var(--strong)"
  when: string;
  /** CV-to-posting fit. Absent when nothing scored it (e.g. added by hand). */
  match?: number;
  note: string;
  rejected?: boolean;
  /** Set once the card reaches Interview, and kept if it later moves on. */
  reachedInterview?: boolean;
  /** When the card last changed column; `when: "today"` is rendered relative to it. */
  movedAt?: number;
  appliedDate?: number;
  remind?: string; // yyyy-mm-dd
  /** The scheme's opening and closing dates, entered by the student from the
   *  company's own careers page. Never seeded: an invented deadline is worse than none. */
  opens?: string; // yyyy-mm-dd
  deadline?: string; // yyyy-mm-dd
}

export interface BoardColumn {
  id: "saved" | "applied" | "interview" | "offer" | "rejected";
  title: string;
  tone: string;
  cards: BoardCard[];
}

/* ── Tracker board ─────────────────────────────────────────────────── */

/** The five tracker columns. A new user starts with every one empty; cards
 *  arrive only from roles the student actually saves.
 *
 *  This was BOARD_SEED — the same columns pre-filled with eight invented
 *  applications — with EMPTY_BOARD derived from it by stripping the cards.
 *  Only the shells were ever read, so those cards reached no screen while
 *  still shipping in the bundle: fabricated pipeline entries against named
 *  employers, including a rejection attributed to Optiver ("auto-rejection
 *  arrived 2 hours after applying") and a ghosting attributed to Palantir.
 *  Inventing how a real company treated an applicant is a claim the product
 *  cannot stand behind, so the cards are gone and the columns are declared
 *  directly. */
export const EMPTY_BOARD: BoardColumn[] = [
  { id: "saved", title: "Saved", tone: "var(--faint)", cards: [] },
  { id: "applied", title: "Applied", tone: "var(--active)", cards: [] },
  { id: "interview", title: "Interview", tone: "var(--accent)", cards: [] },
  { id: "offer", title: "Offer", tone: "var(--strong)", cards: [] },
  { id: "rejected", title: "Rejected / Ghosted", tone: "var(--risk)", cards: [] },
];

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
  { n: "01", action: "Tailor & apply to Northwind Travel", why: "Highest fit (86) with 6 alumni inside — best odds available today.", impact: "act now", color: "var(--strong)", href: "/jobs" },
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
  { company: "Northwind Travel", role: "SWE Intern", fit: 86, fitpct: "86%", tone: "var(--strong)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+8 / 30d", warmText: "● intro", warmColor: "var(--active)", move: "Tailor & apply" },
  { company: "Fairway Sports", role: "Backend Intern", fit: 79, fitpct: "79%", tone: "var(--strong)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+3 / 30d", warmText: "—", warmColor: "var(--faint)", move: "Tailor & apply" },
  { company: "Edgeline", role: "Frontend Intern", fit: 74, fitpct: "74%", tone: "var(--strong)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+4 / 30d", warmText: "—", warmColor: "var(--faint)", move: "Tailor & apply" },
  { company: "Kestrel Bank", role: "Backend Intern", fit: 66, fitpct: "66%", tone: "var(--warn)", sigarrow: "↑", sigcolor: "var(--strong)", trend: "+5 / 30d", warmText: "—", warmColor: "var(--faint)", move: "Tailor CV hard" },
  { company: "Ledgerline", role: "SWE Intern", fit: 58, fitpct: "58%", tone: "var(--warn)", sigarrow: "→", sigcolor: "var(--muted)", trend: "steady", warmText: "—", warmColor: "var(--faint)", move: "Tailor CV hard" },
  { company: "Lakemont Data", role: "SWE Intern", fit: 34, fitpct: "34%", tone: "var(--risk)", sigarrow: "→", sigcolor: "var(--muted)", trend: "steady", warmText: "—", warmColor: "var(--faint)", move: "Build prereq" },
];

/* ── Networking ────────────────────────────────────────────────────── */

export const OUTREACH_PERSONAS = ["Recruiter", "Hiring manager", "Peer / alumnus", "Startup founder"] as const;
export type OutreachPersona = (typeof OUTREACH_PERSONAS)[number];

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

/** Who to reach, the titles they actually go by when you search them, where to
 *  find them, and what to look for first. Grounded in the TechTalk personas +
 *  LinkedIn checklist + Direct Access method — not invented. */
export interface StakeholderSearch {
  kind: string;
  tone: string;
  goesBy: string[];
  where: string;
  research: string;
}

export const STAKEHOLDER_SEARCH: StakeholderSearch[] = [
  {
    kind: "Recruiter",
    tone: "var(--active)",
    goesBy: ["Recruiter", "Talent Acquisition", "Talent Partner", "Talent Sourcer", "Early Careers / University Recruiter", "HR"],
    where: 'LinkedIn: "talent acquisition" + [company] — or whoever posted the specific role',
    research: "Check if they posted about this exact role — they're the most responsive. Note the roles they usually hire for.",
  },
  {
    kind: "Hiring manager",
    tone: "var(--accent)",
    goesBy: ["Engineering Manager", "Head of Engineering", "Tech Lead", "Director of Engineering", "VP Engineering", "CTO"],
    where: 'LinkedIn: "engineering manager" + [company]; often the person who posted the job',
    research: "Read their team's engineering blog and recent talks. Reference one specific thing they built, then ask one sharp question.",
  },
  {
    kind: "Peer / alumnus",
    tone: "var(--strong)",
    goesBy: ["Software Engineer", "Graduate Engineer", "Associate Engineer", "Intern", "Junior Developer"],
    where: 'LinkedIn: "[your university]" + [company] + software engineer — filter to engineers 1–4 years in',
    research: "Shared university halves the barrier. Prioritise former interns and recent grads — they remember applying and refer freely.",
  },
  {
    kind: "Startup founder",
    tone: "var(--warn)",
    goesBy: ["Founder", "Co-founder", "CEO", "CTO", "Founding Engineer"],
    where: "Their company site, LinkedIn, or AngelList — sub-100-person firms (the Direct Access method)",
    research: "Read their product, blog, and GitHub. The one specific detail about their work is non-negotiable — a generic email to 50 startups gets zero replies.",
  },
];

export const NETWORK_RESEARCH_STEPS = [
  "Read their LinkedIn, GitHub, and any blog or talk — about 30 minutes, once.",
  "Find ONE specific thing about their work that genuinely interests you (a post, a project, a decision).",
  "Find ONE real commonality — same university, city, a technology, an event you both attended.",
  "Note their team's current focus so your questions land on what they actually do.",
  "For the role itself: read the JD twice, skim the company's engineering blog, and check Glassdoor for the interview format — then map your evidence to their requirements.",
];

export const COFFEE_CHAT_FRAMEWORK = [
  { n: "1", label: "Opening", time: "~1 min", note: "Intro + gratitude + set a light agenda — setting the agenda reads as leadership.", script: "Would it be OK to spend most of the time on your path into the team, and grab any advice for my next year at the end?" },
  { n: "2", label: "Their story", time: "10–15 min", note: "Your prepared questions — about them, never “what should I do”.", script: "What actually separated strong interns from average ones on your team?" },
  { n: "3", label: "Positioning", time: "2–3 min", note: "Mirror their language, then map one concrete thing of yours onto it.", script: "That retrieval problem is close to what I hit building PathFinder’s RAG pipeline — I used pgvector." },
  { n: "4", label: "Closing", time: "2 min", note: "One takeaway + continued interest + agree the follow-up channel. The indirect close:", script: "What would you focus on over the next six months, in my position?" },
];

/* ── Interview ─────────────────────────────────────────────────────── */

export const IV_TABS: [string, string][] = [["leetcode", "LeetCode"], ["star", "STAR"], ["questions", "Questions"], ["briefing", "Briefing"], ["feedback", "Feedback"]];

// The LeetCode list lives in `./leetcode.ts` — 18 real categories and 100 real
// problems, replacing the five invented patterns that used to sit here.

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
  { label: "Likely questions", text: "JS event loop, a medium array/string problem, a \"why Northwind Travel\" behavioural." },
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
