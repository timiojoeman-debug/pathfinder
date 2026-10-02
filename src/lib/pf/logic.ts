/**
 * PathFinder redesign — pure derivation logic ported from the Claude Design
 * handoff script. Every function is deterministic and side-effect free so
 * pages and the store can share them.
 */

import {
  CHAT_REPLIES,
  DEFAULT_TARGET_KEYWORDS,
  KEYWORD_VOCAB,
  VAGUE_TERMS,
  type BoardCard,
  type BoardColumn,
  type OutreachPersona,
} from "./data";

/* ── Shared scales ─────────────────────────────────────────────────── */

/* The bands once carried "typical callback rate" ranges (3–6%, 8–14%, 18–28%, 30%+) shown as a
   projection. Nothing sourced them, so they're gone; the tracker shows the student's real rate. */
export function bandFor(v: number): { name: string } {
  if (v < 45) return { name: "Early stage" };
  if (v < 65) return { name: "Competitive" };
  if (v < 80) return { name: "Strong" };
  return { name: "Top decile" };
}

/** Tone token for a 0–100 score (thresholds 65 / 45). */
export function toneFor(v: number): string {
  return v >= 65 ? "var(--strong)" : v >= 45 ? "var(--warn)" : "var(--risk)";
}

/** Tone for job/role fit (thresholds 70 / 55). */
export function fitTone(fit: number): string {
  return fit >= 70 ? "var(--strong)" : fit >= 55 ? "var(--warn)" : "var(--risk)";
}

/* ── Readiness (Stage 00) ──────────────────────────────────────────── */

export interface OnbState {
  step: number;
  role: string | null;
  industry: string | null;
  stage: string | null;
  cv: number | null;
  projects: number | null;
  outreach: number | null;
  cadence: number | null;
}

/** The self-assessed baseline from Stage 00. An unanswered slider counts as 0 (this used to
 *  return a flat 74 until all four were set), and the 10% direction share is how much of step 1
 *  (role, industry, stage) is answered. It was a fixed 82, so a blank form scored 8. */
export function readinessFrom(onb: OnbState): number {
  const cv = onb.cv ?? 0, projects = onb.projects ?? 0, outreach = onb.outreach ?? 0, cadence = onb.cadence ?? 0;
  const direction = ([onb.role, onb.industry, onb.stage].filter(Boolean).length / 3) * 100;
  return Math.round(direction * 0.1 + cv * 0.3 + ((projects + outreach) / 2) * 0.35 + cadence * 0.25);
}

/* ── Direction ─────────────────────────────────────────────────────── */

export interface DirectionFields {
  dirRole: string | null;
  dirStack: string[];
  dirIndustry: string | null;
  dirSize: string | null;
  dirSetting: string | null;
}

export function directionReady(d: DirectionFields): boolean {
  return !!(d.dirRole && d.dirIndustry && d.dirSize);
}

export function directionStatement(d: DirectionFields): string {
  if (!directionReady(d)) return "Pick a role, industry and company size to compose your statement.";
  return (
    d.dirRole +
    " internships in " + d.dirIndustry!.toLowerCase() +
    " at " + d.dirSize!.toLowerCase() +
    (d.dirSetting ? " — " + d.dirSetting.toLowerCase() : "") +
    (d.dirStack.length ? ", working in " + d.dirStack.slice(0, 3).join(" / ") : "") +
    "."
  );
}

export function directionSpecificity(d: DirectionFields): { label: string; tone: string } {
  const count =
    [d.dirRole, d.dirIndustry, d.dirSize, d.dirSetting].filter(Boolean).length +
    (d.dirStack.length ? 1 : 0);
  if (count >= 5) return { label: "High specificity", tone: "var(--strong)" };
  if (count >= 3) return { label: "Medium specificity", tone: "var(--warn)" };
  return { label: "Low specificity", tone: "var(--risk)" };
}

export function directionSuggestions(d: DirectionFields): string[] {
  const out: string[] = [];
  if (!d.dirSetting) out.push("Add a work setting (remote / hybrid / on-site) — it changes which boards you should watch.");
  if (d.dirStack.length < 3) out.push("Name at least 3 stack technologies — they become your ATS keywords downstream.");
  if (d.dirIndustry === "Open") out.push("“Open” is honest but weak — shortlist 2 industries and compare postings for a week.");
  if (out.length === 0) out.push("Sharp. Next: mine the title variants below so you don’t miss postings under other names.");
  return out;
}

/** Regex extraction of wizard fields from a free-text chat message. */
export function extractChatPatch(text: string): Partial<DirectionFields> {
  const patch: Partial<DirectionFields> = {};
  if (/front|ui|interface|design/i.test(text)) patch.dirRole = "Frontend";
  else if (/data|ml|machine|model/i.test(text)) patch.dirRole = "Data / ML";
  else if (/backend|systems|infra/i.test(text)) patch.dirRole = "Backend";
  else if (/full|web|product/i.test(text)) patch.dirRole = "Full-Stack SWE";
  if (/fintech|bank|finance|trading/i.test(text)) patch.dirIndustry = "Fintech";
  if (/travel/i.test(text)) patch.dirIndustry = "Travel Tech";
  if (/health/i.test(text)) patch.dirIndustry = "Healthtech";
  if (/startup|small/i.test(text)) patch.dirSize = "Startups 0–50";
  if (/big tech|large|faang/i.test(text)) patch.dirSize = "Big Tech";
  return patch;
}

export function chatReplyFor(turn: number): string {
  return CHAT_REPLIES[Math.min(turn, CHAT_REPLIES.length - 1)];
}

/* ── Target role families ──────────────────────────────────────────────
   Derived from the role the student actually chose, not a fixed table of
   invented fit scores. The relationships (a role narrows, widens, or
   stretches from the primary) are real; there is no fabricated percentage,
   because nothing here has seen the student's CV to compute one. */

export interface RoleFamily {
  title: string;
  note: string;
  relation: "Primary" | "Adjacent" | "Stretch";
  tone: string;
}

const ROLE_FAMILIES: Record<string, RoleFamily[]> = {
  "Full-Stack SWE": [
    { title: "Full-Stack Engineer Intern", note: "Your core target — front end and back end in one role.", relation: "Primary", tone: "var(--strong)" },
    { title: "Frontend Engineer Intern", note: "Narrows to the UI half of your stack — a natural second search.", relation: "Adjacent", tone: "var(--strong)" },
    { title: "Backend Engineer Intern", note: "Narrows to services and data — worth searching under this name too.", relation: "Adjacent", tone: "var(--warn)" },
  ],
  "Frontend": [
    { title: "Frontend Engineer Intern", note: "Your core target — UI, components and browser work.", relation: "Primary", tone: "var(--strong)" },
    { title: "Full-Stack Engineer Intern", note: "Widens to the back end — many front-end interns are hired under this title.", relation: "Adjacent", tone: "var(--strong)" },
    { title: "Design Engineer Intern", note: "Front end with a design-systems slant — a stretch if you have UI work to show.", relation: "Stretch", tone: "var(--warn)" },
  ],
  "Backend": [
    { title: "Backend Engineer Intern", note: "Your core target — APIs, services and data.", relation: "Primary", tone: "var(--strong)" },
    { title: "Full-Stack Engineer Intern", note: "Widens to the UI — a common title for backend-leaning interns.", relation: "Adjacent", tone: "var(--strong)" },
    { title: "Platform / Infrastructure Intern", note: "Deeper into systems — a stretch that rewards a deployed, operable project.", relation: "Stretch", tone: "var(--warn)" },
  ],
  "Data / ML": [
    { title: "Data / ML Engineer Intern", note: "Your core target — models and the pipelines around them.", relation: "Primary", tone: "var(--strong)" },
    { title: "Data Engineer Intern", note: "The pipelines without the modelling — often more intern openings.", relation: "Adjacent", tone: "var(--strong)" },
    { title: "Backend Engineer Intern", note: "Software-heavy roles value ML-adjacent skills — a stretch worth searching.", relation: "Stretch", tone: "var(--warn)" },
  ],
};

/** Role families for the chosen direction — three targets, methodology's cap. */
export function roleFamiliesFor(dirRole: string | null): RoleFamily[] {
  return ROLE_FAMILIES[dirRole ?? ""] ?? ROLE_FAMILIES["Full-Stack SWE"];
}

/* ── CV analysis ───────────────────────────────────────────────────── */

export interface CvAnalysis {
  score: number;
  tone: string;
  dash: number; // stroke-dashoffset for the 150px ring (circumference 402)
  verdict: string;
  sub: string;
  vague: { term: string; fix: string }[];
  missing: { label: string }[];
  targetKw: string[];
}

export function targetKeywords(dirStack: string[]): string[] {
  return dirStack.length ? dirStack : DEFAULT_TARGET_KEYWORDS;
}

export function analyzeCvText(cvText: string, dirStack: string[]): CvAnalysis {
  const lower = cvText.toLowerCase();
  const vague = VAGUE_TERMS.filter(([t]) => lower.indexOf(t) >= 0).map(([term, fix]) => ({ term, fix }));
  const targetKw = targetKeywords(dirStack);
  const missing = targetKw.filter((k) => lower.indexOf(k.toLowerCase()) < 0).map((k) => ({ label: k }));
  const score = Math.max(25, Math.min(95, 92 - vague.length * 7 - missing.length * 6));
  return {
    score,
    tone: score >= 75 ? "var(--strong)" : score >= 55 ? "var(--warn)" : "var(--risk)",
    dash: Math.round(402 * (1 - score / 100)),
    verdict: score >= 75 ? "Strong — tailor per role" : score >= 55 ? "Working — needs tailoring" : "Rebuild the top third",
    sub: vague.length + " vague terms · " + missing.length + " missing keywords for your target stack",
    vague,
    missing,
    targetKw,
  };
}

/* ── Job-description analysis (Phase 03) ───────────────────────────── */

export interface JfRow { kw: string; mark: string; bg: string; action: string }
export interface JfBlocker { text: string; mark: string; bg: string }
export interface JfResult {
  compat: number;
  compatTone: string;
  rows: JfRow[];
  tally: string;
  blockers: JfBlocker[];
  hasBlockers: boolean;
  noBlockers: boolean;
}

/** How much of a posting's named tech the CV already evidences. Null when there is nothing to
 *  score: no CV yet, or a posting that names no technology. It used to start from the student's
 *  self-rated onboarding baseline, which made a slider answer look like a match score. */
export function roleFit(jd: string, cvText: string): number | null {
  const jdLower = jd.toLowerCase();
  const cvLower = cvText.toLowerCase();
  const asked = KEYWORD_VOCAB.filter((k) => jdLower.indexOf(k.toLowerCase()) >= 0);
  if (!asked.length || !cvText.trim()) return null;
  const evidenced = asked.filter((k) => cvLower.indexOf(k.toLowerCase()) >= 0).length;
  let fit = Math.round((evidenced / asked.length) * 100);
  if (/senior|staff|[3-9]\+ years|phd/i.test(jd)) fit -= 26;
  return Math.max(5, Math.min(95, fit));
}

export function analyzeJobDescription(jd: string, cvText: string, targetKw: string[]): JfResult {
  const jdLower = jd.toLowerCase();
  const cvLower = cvText.toLowerCase();
  const kws = KEYWORD_VOCAB.filter((k) => jdLower.indexOf(k.toLowerCase()) >= 0);
  const rows: JfRow[] = kws.slice(0, 8).map((k) => {
    const have = cvLower.indexOf(k.toLowerCase()) >= 0 || targetKw.indexOf(k) >= 0;
    return { kw: k, mark: have ? "✓" : "✕", bg: have ? "var(--strong)" : "var(--risk)", action: have ? "Keep it in the top third" : "Add to Skills + one bullet" };
  });
  const foundN = rows.filter((r) => r.mark === "✓").length;

  const blockers: { text: string; ok: boolean }[] = [];
  if (/no (visa )?sponsor|unable to sponsor|cannot sponsor/i.test(jd)) blockers.push({ text: "No visa sponsorship offered", ok: false });
  else if (/visa|sponsor/i.test(jd)) blockers.push({ text: "Visa sponsorship mentioned — check the licensed-sponsor register", ok: true });
  if (/security clearance/i.test(jd)) blockers.push({ text: "Security clearance required", ok: false });
  const yoe = jd.match(/(\d)\s*\+?\s*years/i);
  if (yoe) blockers.push({ text: yoe[0] + " experience requested", ok: parseInt(yoe[1], 10) <= 1 });
  if (/penultimate|final year|graduating/i.test(jd)) blockers.push({ text: "Year-of-study restriction — check eligibility", ok: true });

  const compat = rows.length ? Math.round(38 + 57 * (foundN / rows.length)) : 62;
  return {
    compat,
    compatTone: compat >= 70 ? "var(--strong)" : compat >= 55 ? "var(--warn)" : "var(--risk)",
    rows,
    tally: foundN + " / " + rows.length + " keywords matched",
    blockers: blockers.map((b) => ({ text: b.text, mark: b.ok ? "✓" : "✕", bg: b.ok ? "var(--strong)" : "var(--risk)" })),
    hasBlockers: blockers.some((b) => !b.ok),
    noBlockers: blockers.length === 0,
  };
}

export interface CoverLetter { p1: string; p2: string; p3: string; words: number; assumptions: string[] }

export function buildCoverLetter(company: string, role: string, jd: string, targetKw: string[]): CoverLetter {
  const jdLower = jd.toLowerCase();
  const letterCompany = company.trim() || "the company";
  const letterRole = role.trim() || "the role";
  const emphasis = jd
    ? KEYWORD_VOCAB.filter((k) => jdLower.indexOf(k.toLowerCase()) >= 0).slice(0, 2).join(" and ") || "engineering rigour"
    : "engineering rigour";
  const p1 = "Dear hiring team, I’m writing to apply for the " + letterRole + " position at " + letterCompany + ". I build with " + targetKw.slice(0, 3).join(", ") + ", and I’d welcome the chance to contribute this summer.";
  const p2 = "Your posting emphasises " + emphasis + " — the same things I focused on in a recent project, where I owned the work end to end and wrote the tests that kept it shipping.";
  const p3 = "I’d value the chance to bring that to " + letterCompany + " this summer. Thank you for your consideration.";
  return {
    p1, p2, p3,
    words: (p1 + " " + p2 + " " + p3).split(/\s+/).length,
    assumptions: ["Add a concrete metric to your project (users, performance, scale)", "Confirm your earliest start date", "Verify the team name before sending", "Swap in your name and a specific example before sending"],
  };
}

/* ── Tracker derivations ───────────────────────────────────────────── */

/** A tracker card's key: company and role together, so two roles at one company don't collide. */
export function trackCardKey(company: string, role: string): string {
  return `${company.trim().toLowerCase()}::${role.trim().toLowerCase()}`;
}

export function columnCount(board: BoardColumn[], id: string): number {
  const col = board.find((c) => c.id === id);
  return col ? col.cards.length : 0;
}

export interface FunnelStage { label: string; value: number; pct: string; color: string }

export function trackerDerived(board: BoardColumn[], netSent: number) {
  const submitted = columnCount(board, "applied") + columnCount(board, "interview") + columnCount(board, "offer") + columnCount(board, "rejected");
  // A callback stays a callback: a card rejected after its interview still counts,
  // or moving it to Rejected would quietly lower the student's interview rate.
  const interviews = board.reduce(
    (n, col) => n + col.cards.filter((c) => col.id === "interview" || col.id === "offer" || c.reachedInterview).length,
    0,
  );
  const offers = columnCount(board, "offer");
  const now = Date.now();
  let weeklyCount = 0;
  board.forEach((col) =>
    col.cards.forEach((c) => {
      if (c.appliedDate && now - c.appliedDate < 6048e5) weeklyCount += 1;
    }),
  );
  // Source (TechTalk Four Pillars): aim for ~10-15 quality applications/week.
  // We target a middle ground of 5-8 deeply-tailored/week for a student's time
  // budget, and only flag "too many" past ~10 — not at 3, which would have
  // scolded students for following the methodology.
  const weeklyGoal = 6;
  const weeklyMax = 10;
  const weeklyPct = Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100)) + "%";
  const weeklyTone = weeklyCount > weeklyMax ? "var(--risk)" : weeklyCount >= weeklyGoal ? "var(--strong)" : "var(--warn)";
  const weeklyNote =
    weeklyCount > weeklyMax
      ? "Over " + weeklyMax + " this week — slow down. Quality over quantity: tailor harder, apply less."
      : weeklyCount >= weeklyGoal
        ? "On target. 5–8 tailored applications a week keeps you in the top consistency band."
        : "Aim for 5–8 tailored applications a week — you need " + (weeklyGoal - weeklyCount) + " more by Sunday.";

  const stats = [
    { label: "Applications sent", value: submitted, color: "var(--fg)" },
    { label: "Networking sent", value: netSent, color: "var(--active)" },
    { label: "Interviews landed", value: interviews, color: "var(--accent)" },
    { label: "Offers", value: offers, color: "var(--strong)" },
  ];
  const ivRate = submitted ? interviews / submitted : 0;
  const funnel: FunnelStage[] = [
    // a full bar only when something was applied to: at zero it drew "100%" of nothing
    { label: "Applied", value: submitted, pct: submitted ? "100%" : "0%", color: "var(--fg)" },
    { label: "Interviews", value: interviews, pct: Math.round(ivRate * 100) + "%", color: "var(--active)" },
    { label: "Offers", value: offers, pct: (submitted ? Math.round((offers / submitted) * 100) : 0) + "%", color: "var(--strong)" },
  ];
  let leakLabel: string;
  let leakHref: string;
  if (submitted < 5) { leakLabel = "Diagnose: too few submissions — keep the cadence"; leakHref = "/jobs"; }
  else if (ivRate < 0.10) { leakLabel = "Diagnose: interview rate < 10% — fix your CV"; leakHref = "/cv"; }
  else if (interviews > 0 && offers / interviews < 0.25) { leakLabel = "Diagnose: offers lagging — prep interviews"; leakHref = "/interview"; }
  else { leakLabel = "Pipeline healthy — keep the cadence"; leakHref = "/jobs"; }

  return { submitted, interviews, offers, weeklyCount, weeklyGoal, weeklyPct, weeklyTone, weeklyNote, stats, funnel, leakLabel, leakHref };
}

/** A card's "when" label. "today" was written once and never aged, so a card applied to a
 *  month ago still said today; it is now read off the timestamp at render time. */
export function cardWhen(c: Pick<BoardCard, "when" | "movedAt" | "appliedDate">, now: number = Date.now()): string {
  const ts = c.movedAt ?? c.appliedDate;
  if (c.when !== "today" || !ts) return c.when;
  const days = Math.floor((now - ts) / 864e5);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : days < 14 ? `${days}d ago` : `${Math.round(days / 7)}w ago`;
}

/** The student's own callback rate: how many sent applications reached an interview. Nothing is
 *  projected. With nothing sent there is no rate, and a handful of applications is called early. */
export function callbackSummary(submitted: number, interviews: number): { value: string; note: string } {
  if (submitted === 0) return { value: "—", note: "Shows once you've sent an application" };
  const pct = Math.round((interviews / submitted) * 100);
  const of = `${interviews} of ${submitted} application${submitted === 1 ? "" : "s"} reached an interview`;
  return { value: pct + "%", note: submitted < 5 ? `${of} · early, small numbers swing` : of };
}

/** Rejection-pattern insight over the diagnosed timings map. */
export function rejectionInsight(diags: Record<string, string>, diagCauses: Record<string, string>): string | null {
  const vals = Object.values(diags);
  let insight: string | null = null;
  ["Within hours", "1–2 days", "1–2 weeks", "Never"].forEach((t) => {
    const n = vals.filter((v) => v === t).length;
    if (!insight && vals.length >= 2 && n / vals.length >= 0.5 && n >= 2) {
      insight = Math.round((n / vals.length) * 100) + "% of your diagnosed rejections came \"" + t.toLowerCase() + "\" — " + diagCauses[t];
    }
  });
  return insight;
}

/* ── Misc ──────────────────────────────────────────────────────────── */

/* ── Scheme timing ─────────────────────────────────────────────────── */

/** A tracked scheme's dates, as the student entered them. */
export type SchemeWindow = Pick<BoardCard, "company" | "role" | "opens" | "deadline">;

export interface TimingStep {
  kind: "outreach" | "ask" | "apply";
  date: string; // yyyy-mm-dd the step is due
  due: boolean; // on or after `date`
  title: string;
  why: string;
}

const DAY_MS = 86_400_000;
const shiftDate = (iso: string, days: number) => new Date(Date.parse(iso + "T00:00:00Z") + days * DAY_MS).toISOString().slice(0, 10);

/** Today as yyyy-mm-dd in local time, the same form the date inputs store. */
export function isoToday(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Works back from a scheme's real dates to the step that matters now.
 * Referrals take weeks to earn, so conversations start about six weeks before
 * the deadline, the referral ask comes one to two weeks before it, and the
 * application goes in on opening day. Returns the latest step that is already
 * due, else the next one coming; null when no dates are set or the scheme has closed.
 */
export function timingPlan(w: SchemeWindow, today: string): TimingStep | null {
  const anchor = w.deadline || w.opens;
  if (!anchor) return null;
  if (w.deadline && today > w.deadline) return null;
  const at = w.company;
  const closes = w.deadline ? ` It closes ${formatReminder(w.deadline)}.` : "";
  const steps: Omit<TimingStep, "due">[] = [
    {
      kind: "outreach", date: shiftDate(anchor, -42),
      title: `Start talking to people at ${at}`,
      why: `A referral takes weeks to earn, so the conversations start about six weeks out.${closes}`,
    },
    {
      kind: "ask", date: shiftDate(anchor, -14),
      title: `Ask for a referral at ${at}`,
      why: `One to two weeks before the deadline, ask a peer you've spoken to. Only people on the team can refer you.${closes}`,
    },
    {
      kind: "apply", date: w.opens || shiftDate(anchor, -14),
      title: `Apply to ${at}`,
      why: w.opens
        ? `Applications opened ${formatReminder(w.opens)}, and early ones are read before the pile builds.${closes}`
        : `Get it in well before the deadline, with your referral lined up first.${closes}`,
    },
  ];
  // On the same day the ask comes before the application.
  steps.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "apply" ? 1 : b.kind === "apply" ? -1 : 0));
  // In the last three days only the application matters.
  if (w.deadline && today >= shiftDate(w.deadline, -3)) return { ...steps.find((s) => s.kind === "apply")!, due: true };
  const due = steps.filter((s) => s.date <= today);
  return due.length ? { ...due[due.length - 1], due: true } : { ...steps[0], due: false };
}

export function formatReminder(v: string): string {
  try {
    return new Date(v + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return v;
  }
}

export function followUpMessage(to: string): string {
  const first = to.trim() ? to.trim().split(" ")[0] : "there";
  return "Hi " + first + " — quick follow-up on my last note. Since then I shipped the improvement you suggested (repo link below). Still keen on that 15 minutes if your week allows.";
}

/* ── Outreach (Phase 04) ───────────────────────────────────────────────
   A structural template the student edits and tailors, built from the real
   recipient they entered — never a fabricated named contact. The bracketed
   lines are prompts to fill in, not invented facts. The AI regenerate path
   produces the fully tailored version. */

export function outreachSubject(persona: OutreachPersona, role: string): string {
  switch (persona) {
    case "Recruiter":
      return `CS student — quick question on your ${role.toLowerCase()} track`;
    case "Hiring manager":
      return "A question about your team's work";
    case "Peer / alumnus":
      return "Fellow student — 15-min coffee chat?";
    case "Startup founder":
      return "I tried your product — and a question";
  }
}

export function buildOutreachTemplate(
  persona: OutreachPersona,
  o: { name: string; company: string; role: string; techs: string },
): string[] {
  const hi = o.name.trim() ? `Hi ${o.name.trim()},` : "Hi there,";
  const at = o.company.trim() ? ` at ${o.company.trim()}` : "";
  const stack = o.techs.trim() || "my core stack";
  const role = o.role.toLowerCase();
  switch (persona) {
    case "Recruiter":
      return [
        `${hi} I'm a CS student focused on ${role} work (${stack}). I saw the ${role} opening${at} and wanted to reach out directly.`,
        "I recently shipped a deployed project I can point to, and I'd value 15 minutes to learn what a strong application looks like to your team — no ask beyond that.",
        "[Add one specific thing you noticed about the team or a recent post before sending.] Thanks either way. [Your name]",
      ];
    case "Hiring manager":
      return [
        `${hi} I'm a CS student working in ${stack}, aiming at ${role} internships${at}.`,
        "[Reference one concrete thing their team built or wrote about — this is what earns the reply.] I hit a related problem in a recent project and would value your read on it.",
        "One sharp question, not a pitch: [ask something specific about how they work]. Thank you. [Your name]",
      ];
    case "Peer / alumnus":
      return [
        `${hi} I'm a CS student aiming at ${role} internships${at ? `, and${at} is top of my list` : ""}.`,
        "Could I buy you a virtual coffee for 15 minutes? I'd love to hear what the intern experience is actually like — and what you wish you'd known applying.",
        "No agenda beyond that. Happy to work around your week. [Your name]",
      ];
    case "Startup founder":
      return [
        `${hi} I'm a CS student. [Say what you built or tried with their product — one honest sentence.]`,
        `I'm looking for a summer internship where I'd ship real product${at ? ` — ${o.company.trim()} is exactly the kind of team I mean` : ""}. If you're taking anyone on, I'd love to show you what I've built.`,
        "[Add one specific, useful observation about their product.] Either way — thanks for building it. [Your name]",
      ];
  }
}

/* ── Phase 03 / 04 display + composition helpers ───────────────────── */

/** Fit-filter predicate for a scored job card (Phase 03). A role with no known
 *  fit is hidden once a threshold is set — it has no score to compare. */
export function jobPassesFit(job: { fit: number; fitKnown?: boolean }, minFit: number): boolean {
  return minFit <= 0 || (job.fitKnown !== false && job.fit >= minFit);
}

/** What the outreach AI personalises on: research findings first, then the
 *  profile text the student pasted, then a neutral fallback. Never invents. */
export function composeSharedAttributes(
  research: { connectionPoints?: string[]; outreachAngles?: string[] } | null,
  pasted: { about?: string; experience?: string },
  fallback: string,
): string {
  const bits = [
    ...(research?.connectionPoints ?? []),
    ...(research?.outreachAngles ?? []),
    ...[pasted.about, pasted.experience].map((x) => (x ?? "").trim()).filter(Boolean),
  ].filter(Boolean);
  return bits.join(" | ") || fallback;
}
