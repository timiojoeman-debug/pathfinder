import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { buildExploreRolesPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

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
