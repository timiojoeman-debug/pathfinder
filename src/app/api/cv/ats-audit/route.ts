import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildATSAuditPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { jobDescription, cvData } = __p.data;
    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const systemPrompt = buildATSAuditPrompt(jobDescription);
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `CV data:\n${typeof cvData === 'string' ? cvData : JSON.stringify(cvData || {})}`,
      temperature: 0.3,
    },
    aiEnvelope(["criticalKeywords", "overallATSScore"]),
    "cv/ats-audit",
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'ATS audit failed', retryable: true },
      { status: 500 }
    );
  }
}
