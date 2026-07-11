import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { callAI } from '@/lib/ai';
import { buildSTARPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { rawStory, category } = __p.data;
    if (!rawStory) {
      return NextResponse.json({ error: 'Raw story is required' }, { status: 400 });
    }

    const systemPrompt = buildSTARPrompt(rawStory, category || 'challenge');
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Evaluate and structure this STAR story.`,
      temperature: 0.3,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'STAR builder failed', retryable: true },
      { status: 500 }
    );
  }
}
