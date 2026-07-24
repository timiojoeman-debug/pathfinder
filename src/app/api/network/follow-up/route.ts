import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated, envelopeMessage } from "@/lib/ai";
import { buildFollowUpPrompt } from '@/lib/prompts';
import { checkNaturalness } from '@/lib/ai/naturalness-check';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { contactName, chatNotes, cadenceStep } = __p.data;
    if (!contactName || !cadenceStep) {
      return NextResponse.json({ error: 'Contact name and cadence step required' }, { status: 400 });
    }

    const systemPrompt = buildFollowUpPrompt(contactName, chatNotes || '', cadenceStep);
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `Generate follow-up step ${cadenceStep} for ${contactName}.`,
      temperature: 0.7,
    },
    aiEnvelope(["message"]),
    "network/follow-up",
    );

    // `aiEnvelope` puts the payload under `data` — reading `message` off the
    // root scored an empty string every time and reported it as natural.
    const naturalness = checkNaturalness(envelopeMessage(result), { type: 'outreach' });

    return NextResponse.json({ ...result, naturalness });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Follow-up generation failed';
    // The buildFollowUpPrompt throws if chat notes are empty for step 1
    if (message.includes('need to know what you discussed')) {
      return NextResponse.json({ error: message, retryable: false }, { status: 400 });
    }
    return NextResponse.json({ error: message, retryable: true }, { status: 500 });
  }
}
