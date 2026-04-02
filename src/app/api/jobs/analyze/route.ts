import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildATSAuditPrompt, buildMatchScorePrompt } from "@/lib/prompts";

type AnalyzeBody = {
  jobTitle?: string;
  company?: string;
  jobDescription: string;
  cvSummary?: string;
  userLinkedInUrl?: string;
  userLinkedIn?: string;
};

function computeMatchScore(cvAndProfile: string, jobDescription: string): { score: number; keywords: string[] } {
  const normalizedProfile = cvAndProfile.toLowerCase();
  const normalizedDesc = jobDescription.toLowerCase();

  const keywordCandidates = [
    "react", "node", "typescript", "python", "java", "sql", "aws", "gcp",
    "docker", "kubernetes", "api", "microservices", "tailwind", "postgresql",
    "javascript", "html", "css", "git", "rest", "graphql", "redux",
  ];

  const keywords: string[] = [];
  let hits = 0;

  for (const kw of keywordCandidates) {
    if (normalizedDesc.includes(kw)) {
      keywords.push(kw);
      if (normalizedProfile.includes(kw)) hits += 1;
    }
  }

  const score = keywords.length ? Math.round((hits / keywords.length) * 100) : 40;
  return { score, keywords: keywords.slice(0, 5) };
}

export async function POST(req: Request) {
  const body = (await req.json()) as AnalyzeBody;
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
      callAI<{
        criticalKeywords: { keyword: string; foundInCV: boolean; suggestedPlacement: string }[];
        atsChecklist: { item: string; passed: boolean; fix: string }[];
        overallATSScore: number;
      }>({
        systemPrompt: buildATSAuditPrompt(jobDescription),
        userMessage,
        temperature: 0.3,
      }),
      callAI<{
        matchScore: number;
        matchedSkills: string[];
        missingSkills: string[];
      }>({
        systemPrompt: buildMatchScorePrompt(jobDescription),
        userMessage,
        temperature: 0.3,
      }),
    ]);

    const atsKeywords = (atsResult.criticalKeywords ?? [])
      .map((k) => k.keyword)
      .slice(0, 5);
    const auditChecklist = (atsResult.atsChecklist ?? []).map(
      (c) => (c.passed ? c.item : `${c.item}: ${c.fix}`)
    );

    return NextResponse.json({
      matchScore: matchResult.matchScore ?? fallback.score,
      atsKeywords: atsKeywords.length >= 3 ? atsKeywords : fallback.keywords,
      auditChecklist:
        auditChecklist.length > 0
          ? auditChecklist
          : [
              "Key skills from the listing appear in your CV/ LinkedIn",
              "At least one project matches this role's tech stack",
              "Keywords are woven naturally into bullets, not stuffed",
              "CV is one page with clean, ATS-friendly formatting",
            ],
    });
  } catch {
    return NextResponse.json({
      matchScore: fallback.score,
      atsKeywords: fallback.keywords,
      auditChecklist: [
        "Key skills from the listing appear in your CV/ LinkedIn",
        "At least one project matches this role's tech stack",
        "Keywords are woven naturally into bullets, not stuffed",
        "CV is one page with clean, ATS-friendly formatting",
      ],
    });
  }
}
