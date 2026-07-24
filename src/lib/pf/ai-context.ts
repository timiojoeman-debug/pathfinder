/**
 * One-line summaries of the derived profile, for the AI routes that take a
 * `studentProfile` string.
 *
 * Several routes want "who is asking" as prose rather than as structured
 * fields. Building that sentence at each call site drifted immediately — the
 * interview briefing described a student one way and the networking prep
 * another, so the same person got outreach and prep that did not match.
 *
 * Everything here is derived from the Career Profile, so nothing is claimed
 * that the event log cannot account for: no skill the CV does not evidence, no
 * count that is not a real count. Empty fields are omitted rather than filled
 * with a plausible default.
 */

import type { CareerProfile } from "./profile";

/** Skills listed inline before the sentence gets unreadable. */
const MAX_SKILLS = 8;

/** Joins the non-empty parts into one sentence, or "" when nothing is known. */
function sentence(parts: (string | null)[]): string {
  const kept = parts.filter((p): p is string => Boolean(p));
  return kept.length ? `${kept.join(". ")}.` : "";
}

/**
 * Who the student is, for prompts that personalise around their real work.
 * Falls back to a role-neutral description rather than inventing a target.
 */
export function studentProfileLine(p: CareerProfile): string {
  return sentence([
    p.targetRole ? `Targeting ${p.targetRole} internships` : "University student targeting software internships",
    p.currentSkills.length ? `Skills: ${p.currentSkills.slice(0, MAX_SKILLS).join(", ")}` : null,
    p.leetSolved > 0 ? `${p.leetSolved} technical problems solved` : null,
  ]);
}

/**
 * The same line plus the networking context the outreach and referral routes
 * use to pitch the student to someone else.
 */
export function networkingProfileLine(p: CareerProfile): string {
  return sentence([
    studentProfileLine(p).replace(/\.$/, ""),
    p.outreachSent > 0 ? `${p.outreachSent} outreach messages sent so far` : null,
    p.targetIndustry ? `Focused on ${p.targetIndustry}` : null,
  ]);
}

/**
 * CV strengths for the referral package — what a contact could credibly say
 * about this student. Drawn from evidenced skills, never from the target list,
 * because a referral that cites a skill the CV does not show is the exact
 * embellishment this product tells students to avoid.
 */
export function cvStrengthLines(p: CareerProfile): string[] {
  const out: string[] = [];
  if (p.currentSkills.length) out.push(`Works with ${p.currentSkills.slice(0, MAX_SKILLS).join(", ")}`);
  if (p.atsScore !== null) out.push(`CV scores ${p.atsScore}/100 against their target role`);
  if (p.leetSolved > 0) out.push(`${p.leetSolved} technical problems solved`);
  if (p.projectsGenerated) out.push("Has a planned portfolio project closing their skill gaps");
  return out;
}
