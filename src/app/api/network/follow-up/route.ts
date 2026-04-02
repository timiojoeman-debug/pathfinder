import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { buildFollowUpPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const { contactName, chatNotes, cadenceStep } = await req.json();
    if (!contactName || !cadenceStep) {
      return NextResponse.json({ error: 'Contact name and cadence step required' }, { status: 400 });
    }

    const systemPrompt = buildFollowUpPrompt(contactName, chatNotes || '', cadenceStep);
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Generate follow-up step ${cadenceStep} for ${contactName}.`,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Follow-up generation failed';
    // The buildFollowUpPrompt throws if chat notes are empty for step 1
    if (message.includes('need to know what you discussed')) {
      return NextResponse.json({ error: message, retryable: false }, { status: 400 });
    }
    return NextResponse.json({ error: message, retryable: true }, { status: 500 });
  }
}
