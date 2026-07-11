import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { callAI } from '@/lib/ai';
import { buildCompanyBriefingPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { companyName, roleName, studentProfile } = __p.data;
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const systemPrompt = buildCompanyBriefingPrompt(
      companyName,
      roleName || 'internship',
      studentProfile || 'Student'
    );
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Generate company research briefing for ${companyName}.`,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Company briefing failed', retryable: true },
      { status: 500 }
    );
  }
}
