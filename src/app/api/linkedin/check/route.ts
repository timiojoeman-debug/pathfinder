import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { headline, aboutSection, targetRole, techStack, industry, cvSummary } = __p.data;
    const cv = typeof cvSummary === 'string' ? cvSummary.trim().slice(0, 3000) : '';
    if (!headline && !aboutSection) {
      return NextResponse.json({ error: 'Headline or about section required' }, { status: 400 });
    }

    const result = await callAIValidated(
      {
      systemPrompt: `You are PathFinder's AI career mentor reviewing LinkedIn profiles following TechTalk methodology.

HEADLINE RULES:
- Prefer a real title ("Computer Science Student | ...", "Software Engineering Intern"); "Aspiring X" only for a genuine career switch with no related experience
- Format: "Software Developer | React & Node.js" (role + key technologies)
- Should match their Direction Statement role

ABOUT SECTION RULES:
- 2-3 paragraphs telling a story: passion, skills, what they're seeking
- First person, not third person
- Include specific tech stack mentions
- Show personality, not just a list of skills

Flag: vague language, missing tech stack, third-person writing, "Aspiring" used by someone who has related experience.

ADDITIONALLY — RECRUITER KEYWORD ANALYSIS:
Based on the student's target role of "${targetRole || 'Software Engineer'}" in "${industry || 'Technology'}", generate a prioritised list of 10–15 keywords that recruiters typically search for when looking for candidates for this type of role.

The student's tech stack includes: ${(techStack as string[])?.join(', ') || 'not specified'}

For each keyword, indicate:
- keyword: the keyword itself
- priority: "critical" (must have), "important" (strongly recommended), or "helpful" (nice to have)
- foundInProfile: whether it appears in the student's current headline or about section
- suggestedPlacement: where to add it if missing — "headline", "about", "skills section", or "experience titles"

These should be specific to the student's target role and tech stack, not generic.
${cv ? `
CV CONSISTENCY CHECK (TechTalk recruiter deck): a recruiter who likes the CV cross-checks the LinkedIn, and does not move forward if the two do not match or at least complement each other. The student also pasted a CV summary. Compare it with the LinkedIn text and add a "feedback" item for each mismatch you can actually see in job titles, roles and their descriptions, employers, and dates. Start that item's "issue" with "CV vs LinkedIn:". Quote both versions in "currentState". Compare only what both texts state; if a detail appears in only one, say it is missing from the other rather than calling it a conflict. If they agree, add no mismatch items and list the agreement under "strengths". Never invent a mismatch.
` : ''}

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Positioning - LinkedIn",
  "score": number,
  "feedback": [{ "issue": string, "severity": string, "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string, "example": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": boolean,
  "data": {
    "headlineScore": number,
    "aboutScore": number,
    "suggestedHeadline": string,
    "suggestedAboutOpener": string
  },
  "keywordAnalysis": {
    "totalKeywords": number,
    "foundInProfile": number,
    "keywords": [{ "keyword": string, "priority": "critical" | "important" | "helpful", "foundInProfile": boolean, "suggestedPlacement": string }]
  }
}`,
      userMessage: `Headline: ${headline || 'Not provided'}\n\nAbout section: ${aboutSection || 'Not provided'}${cv ? `\n\nCV summary (for the consistency check only):\n${cv}` : ''}`,
      temperature: 0.3,
    },
    aiEnvelope(["suggestedHeadline"]),
    "linkedin/check",
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'LinkedIn check failed', retryable: true },
      { status: 500 }
    );
  }
}
