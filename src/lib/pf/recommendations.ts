/**
 * PathFinder — recommendation engine. Turns the whole Career Profile into a
 * ranked list of next actions, each with an explicit "why". Every page opens
 * with the top recommendation, and the Command Centre shows the full ranking.
 *
 * Recommendations always consider the entire profile — never a single phase in
 * isolation — so advice shifts as the user progresses ("strong CV, now
 * network"; "enough applications, prep interviews").
 */

import type { CareerProfile } from "./profile";
import type { ProgressReport } from "./progress";
import type { PfPhase } from "./events";
import { isoToday, timingPlan } from "./logic";

export interface Recommendation {
  id: string;
  title: string;
  why: string;
  href: string;
  phase: PfPhase;
  impact: string;
  impactTone: string;
  priority: number; // higher = more urgent
}

export function recommend(p: CareerProfile, progress: ProgressReport, today = isoToday()): Recommendation[] {
  const recs: Recommendation[] = [];

  // 0. A dated step on a scheme the student is chasing. Dates are real and they
  // pass, so a due step outranks everything except having no direction at all.
  for (const w of p.schemeWindows) {
    const step = timingPlan(w, today);
    if (!step?.due) continue;
    const phase: PfPhase = step.kind === "apply" ? "tracker" : "networking";
    recs.push({
      id: `timing-${w.company.toLowerCase()}-${step.kind}`,
      title: step.title,
      why: step.why,
      href: phase === "tracker" ? "/tracker" : "/networking",
      phase,
      impact: step.kind === "apply" ? "window open" : "on the clock",
      impactTone: "var(--warn)",
      priority: 95,
    });
  }
  const pct = (phase: PfPhase) => progress.phases.find((x) => x.phase === phase)?.pct ?? 0;

  // 1. Direction is the prerequisite for everything downstream.
  if (!p.directionSet) {
    recs.push({
      id: "set-direction",
      title: "Set your career direction first",
      why: "Everything downstream — CV keywords, job matching, outreach — is tuned to your target role. Two minutes here focuses the whole system.",
      href: "/direction",
      phase: "direction",
      impact: "unlocks all",
      impactTone: "var(--accent)",
      priority: 100,
    });
  }

  // 2. CV before volume applying.
  if (p.directionSet && !p.cvAnalyzed) {
    recs.push({
      id: "analyze-cv",
      title: "Analyze your CV against your direction",
      why: `85% of employers screen with ATS. Score your CV for ${p.targetRole ?? "your target role"} before applying anywhere.`,
      href: "/cv",
      phase: "cv",
      impact: "gate to apply",
      impactTone: "var(--warn)",
      priority: 92,
    });
  }

  // 3. Low ATS → fix CV, don't apply yet.
  if (p.cvAnalyzed && p.atsScore !== null && p.atsScore < 65) {
    recs.push({
      id: "raise-ats",
      title: `Raise your ATS score from ${p.atsScore} before applying`,
      why: p.missingSkills.length
        ? `Your CV is missing ${p.missingSkills.slice(0, 3).join(", ")} — target keywords you'll be filtered on.`
        : "Sharpen the top third and quantify every bullet — you're being filtered before a human reads it.",
      href: "/cv",
      phase: "cv",
      impact: "+odds",
      impactTone: "var(--warn)",
      priority: 88,
    });
  }

  // 4. Missing skills → build a project.
  if (p.directionSet && p.missingSkills.length >= 2 && !p.projectsGenerated) {
    recs.push({
      id: "build-project",
      title: `Build a project covering ${p.missingSkills.slice(0, 2).join(" + ")}`,
      why: `${p.missingSkills.length} of your target-stack skills have no evidence in your CV. A shipped project closes the gap and gives you an interview story.`,
      href: "/cv",
      phase: "cv",
      impact: "closes gap",
      impactTone: "var(--accent)",
      priority: 74,
    });
  }

  // 5. A basic CV is enough to start networking — referrals are the single
  // highest-leverage move, so surface them early, not after a perfect CV.
  if ((p.atsScore ?? 0) >= 55 && p.contactedCompanies.length < 3) {
    recs.push({
      id: "start-networking",
      title: "Get a referral into a target company",
      why: "A referral converts ~4× a cold application — it's the highest-leverage move in the whole search, and the one thing no tool can automate. You don't need a perfect CV to start a coffee chat.",
      href: "/networking",
      phase: "networking",
      impact: "4× odds",
      impactTone: "var(--strong)",
      priority: 90,
    });
  }

  // 6. Build interview readiness *before* the callback — it takes weeks, not days.
  if (p.directionSet && p.applicationsSubmitted >= 2 && p.leetSolved < 30 && p.interviewsLanded === 0) {
    recs.push({
      id: "build-interview-readiness",
      title: "Start interview prep now — before the first callback",
      why: "Interview readiness is built over weeks, not the days between a callback and the round. Begin STAR stories and pattern drills in parallel with applying, so you're ready when it lands.",
      href: "/interview",
      phase: "interview",
      impact: "get ready",
      impactTone: "var(--accent)",
      priority: 84,
    });
  }

  // 7. Interview in the pipeline → convert what you've earned before applying more.
  if (p.applicationsSubmitted >= 5 && p.interviewsLanded > 0 && p.leetSolved < 55) {
    recs.push({
      id: "prep-interviews",
      title: "Convert the interviews you've earned",
      why: `You have ${p.interviewsLanded} interview${p.interviewsLanded > 1 ? "s" : ""} in the pipeline${p.weakPatterns.length ? ` and weak spots in ${p.weakPatterns[0]}` : ""}. Preparing to convert beats sending more cold applications.`,
      href: "/interview",
      phase: "interview",
      impact: "convert",
      impactTone: "var(--strong)",
      priority: 86,
    });
  }

  // 7. Ready to apply — CV good, direction set, but pipeline thin.
  if ((p.atsScore ?? 0) >= 65 && p.applicationsSubmitted < 3) {
    recs.push({
      id: "start-applying",
      title: "Start applying — your CV clears the bar",
      why: `ATS ${p.atsScore} is high enough to apply. Tailor to your strongest matches (${p.targetCompanies.slice(0, 2).map((c) => c.company).join(", ")}) and get 3 out this week.`,
      href: "/jobs",
      phase: "jobs",
      impact: "act now",
      impactTone: "var(--strong)",
      priority: 78,
    });
  }

  // 8. Over-applying without networking → rebalance.
  if (p.applicationsSubmitted > 5 && p.outreachSent <= 10) {
    recs.push({
      id: "rebalance",
      title: "You've applied enough — network before sending more",
      why: `${p.applicationsSubmitted} applications out but little networking. Cold volume has diminishing returns; a single referral beats ten more cold applications.`,
      href: "/networking",
      phase: "networking",
      impact: "rebalance",
      impactTone: "var(--warn)",
      priority: 70,
    });
  }

  // 9. Weak LeetCode pattern with an interview looming.
  if (p.weakPatterns.length && p.interviewsLanded > 0) {
    recs.push({
      id: "drill-pattern",
      title: `Drill ${p.weakPatterns[0]} before your next interview`,
      why: `It's your weakest pattern and you have a technical round in the pipeline. Two mediums a day closes it fast.`,
      href: "/interview",
      phase: "interview",
      impact: "+readiness",
      impactTone: "var(--warn)",
      priority: 72,
    });
  }

  // Fallback — keep the lowest-scoring phase moving.
  if (recs.length === 0) {
    const lowest = [...progress.phases].sort((a, b) => a.pct - b.pct)[0];
    recs.push({
      id: "advance-lowest",
      title: `Keep ${lowest.label} moving`,
      why: `It's your lowest phase at ${lowest.pct}%. Small, steady progress here lifts your overall readiness the most.`,
      href: `/${lowest.phase === "cv" ? "cv" : lowest.phase}`,
      phase: lowest.phase,
      impact: "steady",
      impactTone: "var(--muted)",
      priority: 40,
    });
  }

  void pct; // reserved for future weighting
  return recs.sort((a, b) => b.priority - a.priority);
}

/** The single most important next action. */
export function topRecommendation(p: CareerProfile, progress: ProgressReport): Recommendation {
  return recommend(p, progress)[0];
}
