import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildMatchScorePrompt } from '@/lib/prompts';
import { cleanMustHaves } from '@/lib/methodology/recruiter-signals';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { jobDescription, cvData } = __p.data;
    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const systemPrompt = buildMatchScorePrompt(jobDescription);
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `CV data:\n${typeof cvData === 'string' ? cvData : JSON.stringify(cvData || {})}`,
      temperature: 0.3,
    },
    aiEnvelope(["matchScore", "matchedSkills"]),
    "cv/match",
    );

    // The model may put the list beside the envelope or inside `data`; the app derives "x of y" from it.
    const mustHaves = cleanMustHaves(result.mustHaves ?? (result.data as { mustHaves?: unknown }).mustHaves);
    return NextResponse.json({ ...result, mustHaves });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Match scoring failed', retryable: true },
      { status: 500 }
    );
  }
}
