import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAI, AIError } from '@/lib/ai';
import { buildTitleVariantPrompt } from '@/lib/prompts/direction-prompts';
import { readBody, zShort } from '@/lib/api';

const TitleVariantSchema = z.object({
  role: zShort(),
  techStack: z.array(zShort(100)).max(30).optional(),
  industry: zShort().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = await readBody(req, TitleVariantSchema);
    if (!parsed.ok) return parsed.response;
    const { role, techStack, industry } = parsed.data;

    if (!role) {
      return NextResponse.json({ error: 'Missing required field: role' }, { status: 400 });
    }

    const systemPrompt = buildTitleVariantPrompt(
      role,
      Array.isArray(techStack) ? techStack : [],
      industry || 'Technology'
    );

    const result = await callAI<{ variants: { title: string; note: string }[] }>({
      systemPrompt,
      userMessage: `Generate job title variants for: ${role}`,
      temperature: 0.3,
    });

    return NextResponse.json({ variants: result.variants || [] });
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json(
        { error: err.message, retryable: err.retryable, available: err.available },
        { status: err.status || 503 }
      );
    }
    console.error('Title variants error:', err);
    return NextResponse.json({ error: 'Failed to generate title variants' }, { status: 500 });
  }
}
