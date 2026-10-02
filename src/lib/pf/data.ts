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

import { ROLE_STACK_TERMS } from "./taxonomy";

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
  /** The posting, when the student added the card by hand with a link. http(s) only. */
  link?: string;
  /** When the student last marked a follow-up as sent. Drafting one does not set it. */
  followedUpAt?: number;
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

const BASE_VOCAB = [
  "React", "TypeScript", "JavaScript", "Next.js", "Node", "Express", "Python", "Go", "Java", "C++",
  "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes", "GraphQL", "REST", "CI/CD", "Testing", "Git", "Linux",
];

/** Engineering terms first, then every role's stack terms (Figma, Tableau, Kotlin, SIEM, roadmapping...),
 *  so a CV or advert for a designer or analyst has something to find. De-duplicated, case-insensitively. */
export const KEYWORD_VOCAB: string[] = [...new Map([...BASE_VOCAB, ...ROLE_STACK_TERMS].map((t) => [t.toLowerCase(), t])).values()];

export const DEFAULT_TARGET_KEYWORDS = ["React", "TypeScript", "Node", "SQL"];

/* ── Direction ─────────────────────────────────────────────────────── */

export const DIR_SETTING_OPTS = ["Remote", "Hybrid", "On-site"];

export const HIRE_FRAMEWORK = [
  { k: "H", label: "Hone direction", note: "Direction statement + 3 target roles" },
  { k: "I", label: "Intensify profile", note: "CV, LinkedIn, GitHub aligned" },
  { k: "R", label: "Raise reach", note: "Warm paths into target tiers" },
  { k: "E", label: "Excel in interviews", note: "STARL + technical patterns" },
];

/* ── Networking ────────────────────────────────────────────────────── */

export const OUTREACH_PERSONAS = ["Recruiter", "Hiring manager", "Peer / alumnus", "Startup founder"] as const;
export type OutreachPersona = (typeof OUTREACH_PERSONAS)[number];

export const NETWORK_PERSONA_ANGLES = [
  { kind: "Recruiter", tone: "var(--active)", title: "Speed & keywords", angle: "Wants fast signal that you match the req. Lead with stack + a quantified win." },
  { kind: "Hiring manager", tone: "var(--accent)", title: "Judgement & fit", angle: "Wants to see how you think. Reference their team’s real work, ask one sharp question. They decide on fit, so don’t ask them for a referral: peers and alumni give those." },
  { kind: "Peer / alumnus", tone: "var(--strong)", title: "Warmth & referral", angle: "Shared background or alumni path. Ask for a coffee chat, never a job. The referral follows." },
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
    where: 'LinkedIn: "talent acquisition" + [company], or whoever posted the specific role',
    research: "Check if they posted about this exact role: they're the most responsive. Note the roles they usually hire for.",
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
    where: 'LinkedIn: "[your university]" + [company] + software engineer, then filter to engineers 1–4 years in',
    research: "Shared university halves the barrier. Prioritise former interns and recent grads: they remember applying and refer freely.",
  },
  {
    kind: "Startup founder",
    tone: "var(--warn)",
    goesBy: ["Founder", "Co-founder", "CEO", "CTO", "Founding Engineer"],
    where: "Their company site, LinkedIn, or AngelList: sub-100-person firms (the Direct Access method)",
    research: "Read their product, blog, and GitHub. The one specific detail about their work is non-negotiable. A generic email to 50 startups gets zero replies.",
  },
];

export const NETWORK_RESEARCH_STEPS = [
  "Read their LinkedIn, GitHub, and any blog or talk. About 30 minutes, once.",
  "Find ONE specific thing about their work that genuinely interests you (a post, a project, a decision).",
  "Find ONE real commonality: same university, city, a technology, an event you both attended.",
  "Note their team's current focus so your questions land on what they actually do.",
  "For the role itself: read the JD twice, skim the company's engineering blog, and check Glassdoor for the interview format, then map your evidence to their requirements.",
];

/** In-person events playbook. Every number here is a TechTalk rule of thumb from the
 *  "network at events" deck, not a study; the page labels it that way. */
export const EVENT_PLAYBOOK = {
  finding: [
    { group: "Platforms", items: ["Luma", "Eventbrite", "Meetup", "LinkedIn Events"] },
    { group: "Communities", items: ["Slack and Discord groups", "Alumni networks", "Women in tech groups", "Student and career communities"] },
    { group: "Hiding in plain sight", items: ["Company careers pages", "Conference side events", "Speakers you follow"] },
  ],
  worthGoing: [
    "30 to 80 people if you want to network; 80 or more if you want to learn (a TechTalk rule of thumb).",
    "Think about who will be in the room.",
    "Think about the format: roundtables, workshops, a seated dinner or something sporty make talking easier.",
    "Try recurring events, so faces become familiar. TechTalk suggests picking one series and going three times.",
  ],
  prep: [
    { step: "Read the guest list", note: "Some platforms show who is attending. At minimum, check the speakers." },
    { step: "Tidy your LinkedIn", note: "People will look you up that night." },
    { step: "Think of a one-liner intro", note: "A clear one-line story. The card below builds three." },
    { step: "Have questions ready", note: "One about the event, one about their work." },
    { step: "Arrive in the first 10 minutes", note: "Joining five people is easy; joining fifty is not." },
    { step: "Take a breath", note: "Everyone there feels just like you." },
  ],
  openers: [
    "What brought you to this one?",
    "What are you working on at the moment?",
    "Mind if I join you? I'm [your name].",
    "Have you been to one of these before?",
    "What did you make of that last point about [topic]?",
    "What are you hoping to get out of tonight?",
  ],
  exits: [
    "I'm going to grab a drink, but this was great. Are you on LinkedIn?",
    "I want to let you meet a few more people, but let's keep talking.",
    "Before I go, I would love to connect.",
  ],
  exitTip: "Connect with them there and then, before you walk away.",
  followUp: [
    { when: "That night", note: "Send the connection request at the event.", now: true },
    { when: "Within 48 hours", note: "A short message that says where you met and one specific detail from the conversation.", now: true },
    { when: "The next few weeks", note: "Engage with what they post and comment where you can, so you stay visible.", now: false },
    { when: "The next few months", note: "Send something useful with no ask attached: an article, an intro, a resource.", now: false },
  ],
};

export const COFFEE_CHAT_FRAMEWORK = [
  { n: "1", label: "Opening", time: "~1 min", note: "Intro + gratitude + set a light agenda. Setting the agenda reads as leadership.", script: "Would it be OK to spend most of the time on your path into the team, and grab any advice for my next year at the end?" },
  { n: "2", label: "Their story", time: "10–15 min", note: "Your prepared questions: about them, never “what should I do”.", script: "What actually separated strong interns from average ones on your team?" },
  { n: "3", label: "Positioning", time: "2–3 min", note: "Mirror their language, then map one concrete thing of yours onto it.", script: "That retrieval problem is close to what I hit building PathFinder’s RAG pipeline. I used pgvector." },
  { n: "4", label: "Closing", time: "2 min", note: "One takeaway + continued interest + agree the follow-up channel. The indirect close:", script: "What would you focus on over the next six months, in my position?" },
];

/* ── Interview ─────────────────────────────────────────────────────── */

export const IV_TABS: [string, string][] = [["leetcode", "LeetCode"], ["star", "STARL"], ["questions", "Questions"], ["briefing", "Briefing"], ["feedback", "Feedback"]];

// The LeetCode list lives in `./leetcode.ts` — 18 real categories and 100 real
// problems, replacing the five invented patterns that used to sit here.

/* ── Tracker ───────────────────────────────────────────────────────── */

export const REJECTION_DIAGNOSIS: Record<string, string> = {
  "Within hours": "Likely automated screening. Check the must-have keywords match before changing anything else, and ask for feedback where you can.",
  "2+ days": "A person probably read it and passed, which points to positioning or fit. Ask for feedback where you can before you rewrite your CV.",
  "1–2 weeks": "Likely lost to a stronger shortlist, or the role closed. Not a CV signal. Ask for feedback where you can.",
  "Never": "Ghosted. Follow up once, then move on. Open a warm path next time, and ask for feedback if anyone replies.",
};

export const DIAG_TIMINGS = ["Within hours", "2+ days", "1–2 weeks", "Never"];

/** Where each diagnosis is fixed. Fast rejections are a CV problem; slow ones and
 *  silence are "not a CV signal", so they point at a warm path, not the CV page. */
export const DIAG_FIX: Record<string, { href: string; label: string }> = {
  "Within hours": { href: "/cv", label: "Check the keywords" },
  "2+ days": { href: "/cv", label: "Check your positioning" },
  "1–2 weeks": { href: "/networking", label: "Find a warm path" },
  "Never": { href: "/networking", label: "Open a warm path" },
};

/* ── Onboarding (Stage 00) ─────────────────────────────────────────── */

export const ONB_CV_OPTS: [string, number][] = [["Needs work", 12], ["Solid draft", 45], ["Tailored & sharp", 85]];
export const ONB_PROJ_OPTS: [string, number][] = [["Just started", 10], ["A couple built", 42], ["Shipped & deployed", 78]];
export const ONB_OUTREACH_OPTS: [string, number][] = [["Haven't started", 8], ["A few contacts", 42], ["Regular warm intros", 80]];
export const ONB_CADENCE_OPTS: [string, number][] = [["Not yet consistent", 8], ["Some weeks", 42], ["3+ / week reliably", 85]];

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
