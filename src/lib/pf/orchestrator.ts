/**
 * PathFinder — AI orchestration layer. The single seam every AI feature calls.
 * It loads the Career Profile, composes a memory context (so the mentor never
 * starts from zero), calls the LLM route, logs the interaction back into the
 * event stream, and returns the result. Any failure falls back silently to the
 * deterministic client logic the pages already carry.
 */

import { makeEvent, relativeTime, type PfEvent, type PfPhase } from "./events";
import type { CareerProfile } from "./profile";
import { LEETCODE_TOTAL } from "./leetcode";

export interface AiInteraction {
  phase: PfPhase;
  summary: string;
  ts: number;
}

/**
 * Compose the profile into a compact context string injected into AI prompts.
 * Kept short and factual — this is what makes the mentor feel persistent.
 */
export function buildMentorContext(p: CareerProfile, recentInteractions: AiInteraction[]): string {
  const lines: string[] = [];
  lines.push("STUDENT CAREER PROFILE (use this — never ask for what's already here):");
  if (p.directionStatement) lines.push(`- Direction: ${p.directionStatement}`);
  else lines.push("- Direction: not set yet");
  if (p.targetRole) lines.push(`- Target role: ${p.targetRole}${p.targetIndustry ? ` in ${p.targetIndustry}` : ""}${p.companySize ? ` at ${p.companySize}` : ""}`);
  if (p.currentSkills.length) lines.push(`- Skills evidenced: ${p.currentSkills.slice(0, 10).join(", ")}`);
  if (p.missingSkills.length) lines.push(`- Missing target skills: ${p.missingSkills.join(", ")}`);
  if (p.atsScore !== null) lines.push(`- Current ATS score: ${p.atsScore}${p.atsDelta ? ` (${p.atsDelta > 0 ? "+" : ""}${p.atsDelta} over time)` : ""}`);
  if (p.targetCompanies.length) lines.push(`- Target companies: ${p.targetCompanies.slice(0, 5).map((c) => `${c.company} (${c.stage}, ${c.fit === null ? "fit not scored" : `fit ${c.fit}`})`).join("; ")}`);
  lines.push(`- Applications: ${p.applicationsSubmitted} submitted, ${p.interviewsLanded} interviews, ${p.offers} offers`);
  lines.push(`- Networking: ${p.outreachSent} messages sent${p.contactedCompanies.length ? `, contacted ${p.contactedCompanies.join(", ")}` : ""}`);
  lines.push(`- Interview prep: ${p.leetSolved}/${LEETCODE_TOTAL} LeetCode${p.weakPatterns.length ? `, weak in ${p.weakPatterns.join(", ")}` : ""}`);
  if (p.strengths.length) lines.push(`- Strengths: ${p.strengths.join("; ")}`);
  if (p.weaknesses.length) lines.push(`- Gaps: ${p.weaknesses.join("; ")}`);

  if (recentInteractions.length) {
    lines.push("");
    lines.push("RECENT AI SESSIONS (reference these naturally, e.g. 'last time we…'):");
    recentInteractions.slice(0, 5).forEach((i) => lines.push(`- ${relativeTime(i.ts)}: ${i.summary}`));
  }
  return lines.join("\n");
}

/**
 * "What changed" — a short list of recent, human-readable profile movements
 * built from the event stream. Powers the Command Centre's memory feed and the
 * mentor's opening line ("Your ATS score went 52 → 71").
 */
export function whatChanged(events: PfEvent[], limit = 6): string[] {
  return [...events]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map((e) => e.label);
}

/**
 * Call an AI route with profile memory attached and log the interaction.
 * `bodyBuilder` receives the memory context so callers can weave it into the
 * fields their route already understands (cvSummary, directionStatement, etc).
 */
export async function callMentor<T>(opts: {
  phase: PfPhase;
  endpoint: string;
  profile: CareerProfile;
  interactions: AiInteraction[];
  buildBody: (context: string) => unknown;
  parse: (json: unknown) => T | null;
  summarize: (result: T) => string;
}): Promise<{ result: T | null; event: PfEvent | null }> {
  const context = buildMentorContext(opts.profile, opts.interactions);
  try {
    const res = await fetch(opts.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts.buildBody(context)),
    });
    if (!res.ok) return { result: null, event: null };
    const json: unknown = await res.json();
    const result = opts.parse(json);
    if (result === null) return { result: null, event: null };
    const event = makeEvent("AiConsulted", opts.phase, opts.summarize(result), { endpoint: opts.endpoint });
    return { result, event };
  } catch {
    return { result: null, event: null };
  }
}
