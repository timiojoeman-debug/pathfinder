import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildPostInterviewPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { interviewType, questionsAsked, selfRatings, wentWell, wouldChange, previousInterviews, company } = __p.data;
    if (!interviewType) {
      return NextResponse.json({ error: 'Interview type is required' }, { status: 400 });
    }

    const systemPrompt = buildPostInterviewPrompt(
      interviewType,
      questionsAsked || '',
      selfRatings || {},
      wentWell || '',
      wouldChange || '',
      previousInterviews || '',
      typeof company === 'string' ? company.trim() : ''
    );
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `Analyse this ${interviewType} interview and generate feedback.`,
      temperature: 0.7,
    },
    aiEnvelope(["analysis"]),
    "interview/feedback",
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Interview feedback failed', retryable: true },
      { status: 500 }
    );
  }
}
