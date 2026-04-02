import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { buildStartupOutreachPrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const { studentProfile, companyName, companyDetail } = await req.json();
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const systemPrompt = buildStartupOutreachPrompt(
      studentProfile || 'Student seeking internship',
      companyName,
      companyDetail || ''
    );
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Generate startup outreach for ${companyName}.`,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Startup outreach failed';
    if (message.includes('non-negotiable')) {
      return NextResponse.json({ error: message, retryable: false }, { status: 400 });
    }
    return NextResponse.json({ error: message, retryable: true }, { status: 500 });
  }
}
