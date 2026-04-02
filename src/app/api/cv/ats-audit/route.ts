import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { buildATSAuditPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const { jobDescription, cvData } = await req.json();
    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const systemPrompt = buildATSAuditPrompt(jobDescription);
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `CV data:\n${typeof cvData === 'string' ? cvData : JSON.stringify(cvData || {})}`,
      temperature: 0.3,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'ATS audit failed', retryable: true },
      { status: 500 }
    );
  }
}
