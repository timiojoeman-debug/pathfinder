import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAI } from '@/lib/ai';
import { buildExploreRolesPrompt } from '@/lib/prompts';
import { readBody, zText } from '@/lib/api';

const ExploreSchema = z.object({
  messages: z.array(z.object({ role: z.string().max(30), content: zText(8000) })).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const parsed = await readBody(req, ExploreSchema);
    if (!parsed.ok) return parsed.response;
    const { messages } = parsed.data;

    const conversationHistory = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join('\n');

    const systemPrompt = buildExploreRolesPrompt(conversationHistory);
    const result = await callAI<{
      data: {
        response: string;
        extractedPreferences: { role: string; industry: string; techStack: string[]; location: string };
        readyForStatement: boolean;
        suggestedStatement: string | null;
      };
      nextQuestion: string;
    }>({
      systemPrompt,
      userMessage: messages[messages.length - 1].content,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI analysis failed', retryable: true },
      { status: 500 }
    );
  }
}
