import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { buildCoffeeChatPrepPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const { contactName, contactRole, contactCompany, studentProfile, coffeeChatsDone } = await req.json();
    if (!contactName || !contactCompany) {
      return NextResponse.json({ error: 'Contact name and company are required' }, { status: 400 });
    }

    const systemPrompt = buildCoffeeChatPrepPrompt(
      contactName,
      contactRole || 'Unknown',
      contactCompany,
      studentProfile || 'Student seeking internship',
      coffeeChatsDone ?? 0
    );
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Prepare a coffee chat with ${contactName} at ${contactCompany}.`,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Coffee chat prep failed', retryable: true },
      { status: 500 }
    );
  }
}
