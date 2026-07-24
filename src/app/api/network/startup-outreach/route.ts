import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated, envelopeMessage } from "@/lib/ai";
import { buildStartupOutreachPrompt } from '@/lib/prompts';
import { checkNaturalness } from '@/lib/ai/naturalness-check';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { studentProfile, companyName, companyDetail } = __p.data;
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const systemPrompt = buildStartupOutreachPrompt(
      studentProfile || 'Student seeking internship',
      companyName,
      companyDetail || ''
    );
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `Generate startup outreach for ${companyName}.`,
      temperature: 0.7,
    },
    aiEnvelope(["message"]),
    "network/startup-outreach",
    );

    // See the note in `envelopeMessage` — the payload is under `data`.
    const naturalness = checkNaturalness(envelopeMessage(result), { type: 'outreach' });

    return NextResponse.json({ ...result, naturalness });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Startup outreach failed';
    if (message.includes('non-negotiable')) {
      return NextResponse.json({ error: message, retryable: false }, { status: 400 });
    }
    return NextResponse.json({ error: message, retryable: true }, { status: 500 });
  }
}
