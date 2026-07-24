import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, zShort, zText } from "@/lib/api";
import { aiShape, callAIValidated } from "@/lib/ai";

/**
 * Narrate the derived Career Profile in plain English.
 *
 * This is a *presentation* layer and nothing more. `deriveProfile()` is
 * deterministic and `computeProgress()` must stay evidence-derived, so the
 * model is given the already-derived facts and asked only to restate them —
 * it never contributes a number, a score, or a claim that feeds back into any
 * derivation. The client renders the result as narration, labelled as such,
 * with every figure still coming from `progress.ts`.
 *
 * The prompt's hard rule is therefore "add nothing". A narrator that helpfully
 * infers the student is "clearly ready for interviews" has invented progress,
 * which is the failure mode the whole Career-OS design exists to prevent.
 */

const NarrateSchema = z.object({
  directionStatement: zShort().optional(),
  targetRole: zShort().optional(),
  currentPhase: zShort().optional(),
  strengths: z.array(zShort()).max(12).optional(),
  weaknesses: z.array(zShort()).max(12).optional(),
  currentSkills: z.array(zShort()).max(20).optional(),
  missingSkills: z.array(zShort()).max(20).optional(),
  /** Pre-rendered "82% · CV" style lines, computed client-side by progress.ts. */
  progressLines: z.array(zShort()).max(12).optional(),
  recentActivity: z.array(zText()).max(12).optional(),
});

const NarrationResponse = aiShape(
  z.object({
    narration: z.string().min(1),
    /** One sentence on what the profile suggests doing next, drawn only from
     *  the gaps supplied. Optional — the model may have nothing to add. */
    focus: z.string().optional(),
  }),
);

const SYSTEM = `You narrate a university student's career profile back to them in plain English. You are a mirror, not an assessor.

ABSOLUTE RULES — these override everything else:
- Restate ONLY the facts supplied. Add no skill, no achievement, no number, no company, no judgement that is not in the input.
- Never invent or estimate a score, percentage, count, or readiness level. If a figure is not supplied, do not mention one.
- Never predict outcomes ("you'll get interviews", "employers will love this"). You do not know.
- If the input is nearly empty, say so plainly and briefly. Do not pad it into something encouraging.
- Do not congratulate or motivate. Describe.

STYLE:
- Second person, UK spelling, warm but level.
- Two short paragraphs, maximum 110 words total. Fewer if there is less to say.
- Lead with where they actually are, then what the gaps are.
- Plain sentences. No bullet points, no headings, no bold.

Respond ONLY with valid JSON:
{"narration": "the two paragraphs", "focus": "one sentence on the most useful next area, drawn only from the supplied gaps"}`;

/** Render the supplied facts as a compact brief, omitting empty sections so
 *  the model is never handed an empty heading to fill in. */
function buildFacts(b: z.infer<typeof NarrateSchema>): string {
  const section = (label: string, items?: string[]) =>
    items?.length ? `${label}:\n${items.map((i) => `- ${i}`).join("\n")}` : null;

  return [
    b.directionStatement ? `Direction: ${b.directionStatement}` : "Direction: not set yet",
    b.targetRole ? `Target role: ${b.targetRole}` : null,
    b.currentPhase ? `Current phase: ${b.currentPhase}` : null,
    section("Progress (already computed — quote these figures exactly, invent none)", b.progressLines),
    section("Strengths", b.strengths),
    section("Gaps", b.weaknesses),
    section("Skills evidenced in their CV", b.currentSkills),
    section("Skills missing against their target", b.missingSkills),
    section("Recent activity", b.recentActivity),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: Request) {
  const parsed = await readBody(req, NarrateSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await callAIValidated(
      {
        systemPrompt: SYSTEM,
        userMessage: `Narrate this profile:\n\n${buildFacts(parsed.data)}`,
        temperature: 0.4,
      },
      NarrationResponse,
      "mentor/narrate",
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Narration failed", retryable: true },
      { status: 500 },
    );
  }
}
