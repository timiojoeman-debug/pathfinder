import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import { buildReferralPackagePrompt } from '@/lib/prompts';

export async function POST(req: Request) {
  try {
    const { studentProfile, contactName, roleName, chatNotes, cvStrengths } = await req.json();
    if (!contactName || !roleName) {
      return NextResponse.json({ error: 'Contact name and role are required' }, { status: 400 });
    }

    const systemPrompt = buildReferralPackagePrompt(
      studentProfile || 'Student',
      contactName,
      roleName,
      chatNotes || '',
      cvStrengths || []
    );
    const result = await callAI<Record<string, unknown>>({
      systemPrompt,
      userMessage: `Generate referral package for ${contactName} to refer the student for ${roleName}.`,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Referral package failed', retryable: true },
      { status: 500 }
    );
  }
}
