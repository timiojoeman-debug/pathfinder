import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIValidated, AIError, aiShape } from '@/lib/ai';
import { buildTitleVariantPrompt } from '@/lib/prompts/direction-prompts';
import { readBody, zShort } from '@/lib/api';
import { logger } from '@/lib/logger';
import { getCachedAi, setCachedAi } from '@/lib/db/ai-cache';

const ROUTE = 'direction/title-variants';

/** This prompt returns `variants` at the root, but `aiShape` also tolerates
 *  the model nesting it under `data` on some runs. */
const TitleVariantsResponse = aiShape(
  z.object({
    variants: z.array(z.object({ title: z.string(), note: z.string().default('') })).min(1),
  }),
);

const TitleVariantSchema = z.object({
  role: zShort(),
  techStack: z.array(zShort(100)).max(30).optional(),
  industry: zShort().optional(),
  /** Titles the student shortlisted on the Direction page (at most three). */
  targetRoles: z.array(zShort(100)).max(3).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = await readBody(req, TitleVariantSchema);
    if (!parsed.ok) return parsed.response;
    const { role, techStack, industry, targetRoles } = parsed.data;

    if (!role) {
      return NextResponse.json({ error: 'Missing required field: role' }, { status: 400 });
    }

    // Signed-in only (middleware 401s the rest); no header, no cache.
    const userId = req.headers.get('x-user-id');
    if (userId) {
      const hit = await getCachedAi<{ variants: unknown }>(userId, ROUTE, parsed.data);
      if (hit) return NextResponse.json(hit);
    }

    const systemPrompt = buildTitleVariantPrompt(
      role,
      Array.isArray(techStack) ? techStack : [],
      industry || 'Technology',
      targetRoles ?? [],
    );

    const result = await callAIValidated(
      {
        systemPrompt,
        userMessage: `Generate job title variants for: ${role}`,
        temperature: 0.3,
      },
      TitleVariantsResponse,
      'direction/title-variants',
    );

    const out = { variants: result.variants };
    if (userId) await setCachedAi(userId, ROUTE, parsed.data, out);
    return NextResponse.json(out);
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json(
        { error: err.message, retryable: err.retryable, available: err.available },
        { status: err.status || 503 }
      );
    }
    logger.error('direction/title-variants failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to generate title variants' }, { status: 500 });
  }
}
