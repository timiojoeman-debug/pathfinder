import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { headline, aboutSection } = await req.json();
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
