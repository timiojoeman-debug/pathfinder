import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildCoffeeChatPrepPrompt } from '@/lib/prompts';
import { parseContactType } from '@/lib/contact-type';

export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { contactName, contactRole, contactCompany, studentProfile, coffeeChatsDone, contactType } = __p.data;
    if (!contactName || !contactCompany) {
      return NextResponse.json({ error: 'Contact name and company are required' }, { status: 400 });
    }

    const systemPrompt = buildCoffeeChatPrepPrompt(
      contactName,
      contactRole || 'Unknown',
      contactCompany,
      studentProfile || 'Student seeking internship',
      coffeeChatsDone ?? 0,
      parseContactType(contactType)
    );
    const result = await callAIValidated(
      {
      systemPrompt,
      userMessage: `Prepare a coffee chat with ${contactName} at ${contactCompany}.`,
      temperature: 0.7,
    },
    aiEnvelope(["openingScript", "conversationQuestions"]),
    "network/coffee-chat-prep",
    );

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Coffee chat prep failed', retryable: true },
      { status: 500 }
    );
  }
}
