import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildProjectPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { skillGaps, existingSkills, targetRole } = __p.data;

    const systemPrompt = buildProjectPrompt(
      skillGaps || [],
      existingSkills || [],
      typeof targetRole === 'string' ? targetRole.trim() : ''
    );
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `Generate project ideas that close skill gaps and meet the standout-project qualities.`,
      temperature: 0.7,
    },
    aiEnvelope(["projects"]),
    "project-builder/generate",
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Project generation failed', retryable: true },
      { status: 500 }
    );
  }
}
