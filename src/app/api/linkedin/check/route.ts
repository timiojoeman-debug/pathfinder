import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { headline, aboutSection, targetRole, techStack, industry } = await req.json();
    if (!headline && !aboutSection) {
      return NextResponse.json({ error: 'Headline or about section required' }, { status: 400 });
    }

    const result = await callAI<Record<string, unknown>>({
      systemPrompt: `You are PathFinder's AI career mentor reviewing LinkedIn profiles following TechTalk methodology.

HEADLINE RULES:
- Must NOT contain "Aspiring" (tells recruiters you're not qualified yet)
- Format: "Software Developer | React & Node.js" (role + key technologies)
- Should match their Direction Statement role

ABOUT SECTION RULES:
- 2-3 paragraphs telling a story: passion, skills, what they're seeking
- First person, not third person
- Include specific tech stack mentions
- Show personality, not just a list of skills

Flag: vague language, missing tech stack, third-person writing, "Aspiring" anywhere.

ADDITIONALLY — RECRUITER KEYWORD ANALYSIS:
Based on the student's target role of "${targetRole || 'Software Engineer'}" in "${industry || 'Technology'}", generate a prioritised list of 10–15 keywords that recruiters typically search for when looking for candidates for this type of role.

The student's tech stack includes: ${(techStack as string[])?.join(', ') || 'not specified'}

For each keyword, indicate:
- keyword: the keyword itself
- priority: "critical" (must have), "important" (strongly recommended), or "helpful" (nice to have)
- foundInProfile: whether it appears in the student's current headline or about section
- suggestedPlacement: where to add it if missing — "headline", "about", "skills section", or "experience titles"

These should be specific to the student's target role and tech stack, not generic.

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
      userMessage: `Headline: ${headline || 'Not provided'}\n\nAbout section: ${aboutSection || 'Not provided'}`,
      temperature: 0.3,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'LinkedIn check failed', retryable: true },
      { status: 500 }
    );
  }
}
