import { NextResponse } from "next/server";
import { z } from "zod";
import { aiShape, callAIValidated } from "@/lib/ai";

/** These two prompts have been observed returning their payload both at the
 *  root and nested under `data` — aiShape accepts either. */
const AtsResponse = aiShape(
  z.object({
    criticalKeywords: z
      .array(z.object({ keyword: z.string(), foundInCV: z.boolean().default(false), suggestedPlacement: z.string().default("") }))
      .default([]),
    atsChecklist: z
      .array(z.object({ item: z.string(), passed: z.boolean().default(false), fix: z.string().default("") }))
      .default([]),
    overallATSScore: z.number().optional(),
  }),
);

const MatchResponse = aiShape(
  z.object({
    matchScore: z.number(),
    matchedSkills: z.array(z.string()).default([]),
    missingSkills: z.array(z.string()).default([]),
    nonNegotiables: z
      .array(z.object({ requirement: z.string(), category: z.string().default(""), studentMeets: z.boolean().default(false), explanation: z.string().default("") }))
      .optional(),
    hasBlockers: z.boolean().optional(),
    blockerWarning: z.string().nullable().optional(),
  }),
);
import { buildATSAuditPrompt, buildMatchScorePrompt } from "@/lib/prompts";
import { readBody, zShort, zText } from "@/lib/api";
import { computeMatchScore } from "@/lib/jobs/types";
import { logger } from "@/lib/logger";

const AnalyzeSchema = z.object({
  jobTitle: zShort().optional(),
  company: zShort().optional(),
  jobDescription: zText(),
  cvSummary: zText().optional(),
  userLinkedInUrl: zShort(2000).optional(),
  userLinkedIn: zText().optional(),
});

export async function POST(req: Request) {
  const parsed = await readBody(req, AnalyzeSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const jobDescription = body.jobDescription?.trim() || "";
  const cvSummary = body.cvSummary || "";
  const userLinkedInUrl = body.userLinkedInUrl?.trim() || "";
  const userLinkedIn = body.userLinkedIn?.trim() || "";
  const cvAndProfile = [cvSummary, userLinkedIn].filter(Boolean).join("\n");
  const linkedInContext = userLinkedInUrl ? `\nApplicant's LinkedIn URL: ${userLinkedInUrl}` : "";
  const userMessage = `Applicant's CV and profile:\n${cvAndProfile.slice(0, 3000)}${linkedInContext}`;

  if (!jobDescription) {
    return NextResponse.json({ error: "Job description is required" }, { status: 400 });
  }

  const fallback = computeMatchScore(cvAndProfile, jobDescription);

  try {
    const [atsResult, matchResult] = await Promise.all([
      callAIValidated(
        { systemPrompt: buildATSAuditPrompt(jobDescription), userMessage, temperature: 0.3 },
        AtsResponse,
        "jobs/analyze:ats",
      ),
      callAIValidated(
        { systemPrompt: buildMatchScorePrompt(jobDescription), userMessage, temperature: 0.3 },
        MatchResponse,
        "jobs/analyze:match",
      ),
    ]);

    const atsKeywords = (atsResult.criticalKeywords ?? [])
      .map((k) => k.keyword)
      .slice(0, 5);
    const auditChecklist = (atsResult.atsChecklist ?? []).map(
      (c) => (c.passed ? c.item : `${c.item}: ${c.fix}`)
    );

    const criticalKeywordsDetail = (atsResult.criticalKeywords ?? []).slice(0, 10);

    return NextResponse.json({
      source: "ai",
      matchScore: matchResult.matchScore,
      atsKeywords: atsKeywords.length >= 3 ? atsKeywords : fallback.keywords,
      atsKeywordsDetail: criticalKeywordsDetail.length >= 3
        ? criticalKeywordsDetail
        : fallback.keywords.map((k) => ({ keyword: k, foundInCV: false, suggestedPlacement: "Skills section" })),
      // Only what the model actually checked. A generic four-item checklist used
      // to stand in when this was empty, and the page labelled it "AI notes".
      auditChecklist,
      nonNegotiables: matchResult.nonNegotiables ?? [],
      hasBlockers: matchResult.hasBlockers ?? false,
      blockerWarning: matchResult.blockerWarning ?? null,
    });
  } catch (err) {
    logger.error("jobs/analyze — AI unusable, serving keyword estimate", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Still a 200, so the page keeps its local result, but flagged: a keyword
    // overlap must never be labelled as an AI score. Null when the JD names no
    // known keywords, rather than a made-up middling number.
    return NextResponse.json({
      source: "heuristic",
      matchScore: fallback.score,
      atsKeywords: fallback.keywords,
      atsKeywordsDetail: fallback.keywords.map((k) => ({ keyword: k, foundInCV: false, suggestedPlacement: "Skills section" })),
      auditChecklist: [],
    });
  }
}
