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
  type BoardColumn,
} from "./data";

/* ── Shared scales ─────────────────────────────────────────────────── */

export function bandFor(v: number): { name: string; range: string } {
  if (v < 45) return { name: "Early stage", range: "3–6%" };
  if (v < 65) return { name: "Competitive", range: "8–14%" };
  if (v < 80) return { name: "Strong", range: "18–28%" };
  return { name: "Top decile", range: "30%+" };
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

export function readinessFrom(onb: OnbState): number {
  if (!(onb.cv && onb.projects && onb.outreach && onb.cadence)) return 74;
  return Math.round(
    82 * 0.1 + onb.cv * 0.3 + ((onb.projects + onb.outreach) / 2) * 0.35 + onb.cadence * 0.25,
  );
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

export function linkedInIssues(targetKw: string[]) {
  return {
    score: 68,
    issues: [
      { sev: "HIGH", sevCol: "var(--risk)", text: "Headline lists your degree, not your target role — recruiters search by role keywords." },
      { sev: "HIGH", sevCol: "var(--risk)", text: "About section has none of your target-stack keywords (" + targetKw.slice(0, 3).join(", ") + ")." },
      { sev: "MED", sevCol: "var(--warn)", text: "Featured section is empty — pin your deployed project with a one-line metric." },
    ],
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

export function roleFit(jd: string, baseReadiness: number, cvText: string, targetKw: string[]): number {
  const jdLower = jd.toLowerCase();
  const cvLower = cvText.toLowerCase();
  let fit = baseReadiness;
  if (/senior|staff|[3-9]\+ years|phd/i.test(jd)) fit -= 26;
  const matched = KEYWORD_VOCAB.filter(
    (k) => jdLower.indexOf(k.toLowerCase()) >= 0 && (cvLower.indexOf(k.toLowerCase()) >= 0 || targetKw.indexOf(k) >= 0),
  );
  fit += Math.min(10, matched.length * 2);
  return Math.max(20, Math.min(95, fit));
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

export function columnCount(board: BoardColumn[], id: string): number {
  const col = board.find((c) => c.id === id);
  return col ? col.cards.length : 0;
}

export interface FunnelStage { label: string; value: number; pct: string; color: string }

export function trackerDerived(board: BoardColumn[], netSent: number) {
  const submitted = columnCount(board, "applied") + columnCount(board, "interview") + columnCount(board, "offer") + columnCount(board, "rejected");
  const interviews = columnCount(board, "interview") + columnCount(board, "offer");
  const offers = columnCount(board, "offer");
  const now = Date.now();
  let weeklyCount = 0;
  board.forEach((col) =>
    col.cards.forEach((c) => {
      if (c.appliedDate && now - c.appliedDate < 6048e5) weeklyCount += 1;
      else if (c.when === "2d ago" || c.when === "5d ago") weeklyCount += 1;
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
    { label: "Applied", value: submitted, pct: "100%", color: "var(--fg)" },
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

export function formatReminder(v: string): string {
  try {
    return new Date(v + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return v;
  }
}

export function followUpMessage(to: string): string {
  return "Hi " + to.split(" ")[0] + " — quick follow-up on my last note. Since then I shipped the improvement you suggested (repo link below). Still keen on that 15 minutes if your week allows.";
}
