import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildCompanyBriefingPrompt } from '@/lib/prompts';
import { getCachedAi, setCachedAi } from '@/lib/db/ai-cache';

const ROUTE = 'interview/company-briefing';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { companyName, roleName, studentProfile } = __p.data;
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Signed-in only (middleware 401s the rest); no header, no cache.
    const userId = req.headers.get('x-user-id');
    const cacheKey = { companyName, roleName, studentProfile };
    if (userId) {
      const hit = await getCachedAi(userId, ROUTE, cacheKey);
      if (hit) return NextResponse.json(hit);
    }

    const systemPrompt = buildCompanyBriefingPrompt(
      companyName,
      roleName || 'internship',
      studentProfile || 'Student'
    );
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `Generate company research briefing for ${companyName}.`,
      temperature: 0.7,
    },
    aiEnvelope(["companyOverview"]),
    "interview/company-briefing",
    );

    if (userId) await setCachedAi(userId, ROUTE, cacheKey, result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Company briefing failed', retryable: true },
      { status: 500 }
    );
  }
}
