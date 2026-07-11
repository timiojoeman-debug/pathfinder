import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { callAI } from '@/lib/ai';
import { buildProjectPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { skillGaps, existingSkills, targetRole } = __p.data;

    const systemPrompt = buildProjectPrompt(
      skillGaps || [],
      existingSkills || [],
      targetRole || 'Software Engineering Intern'
    );
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Generate project ideas that close skill gaps and meet the 7 Qualities.`,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Project generation failed', retryable: true },
      { status: 500 }
    );
  }
}
