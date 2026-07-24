import { NextResponse } from "next/server";
import { z } from "zod";
import { readLoose } from "@/lib/api";
import { aiShape, callAIValidated } from "@/lib/ai";
import { logger } from "@/lib/logger";

/**
 * Rate a coding solution the student wrote.
 *
 * This used to run through `generateWithAI` with a fallback that returned a
 * fixed `rating: 8, "Solid approach"` on any AI failure — a fabricated score
 * over a solution the model never saw. Rating a student's work when the rater
 * did not run is exactly the confident-number-over-no-evidence failure the
 * product forbids, so this now validates the response and lets a failure surface
 * as an error the UI can show, rather than a made-up 8/10.
 */

const RateResponse = aiShape(
  z.object({
    timeComplexity: z.string().optional(),
    spaceComplexity: z.string().optional(),
    lineCount: z.number().optional(),
    rating: z.number().min(1).max(10),
    feedback: z.string().min(1),
    topTwoApproaches: z.array(z.string()).default([]),
  }),
);

type Body = {
  problemTitle?: string;
  userSolution?: string;
};

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data as Body;

  const problemTitle = body.problemTitle?.trim();
  const userSolution = body.userSolution?.trim();
  if (!userSolution) {
    return NextResponse.json({ error: "Paste your solution or approach to rate it" }, { status: 400 });
  }

  try {
    const result = await callAIValidated(
      {
        systemPrompt:
          "You rate a student's coding solution for interview prep. Judge time complexity, space complexity, and clarity, then give an honest rating out of 10 and specific, actionable feedback. Do not flatter — a brute-force or broken solution should score low and be told why. Return JSON: { timeComplexity, spaceComplexity, lineCount, rating (1-10), feedback, topTwoApproaches (array of the 2 most efficient approaches as strings) }.",
        userMessage: `Problem: ${problemTitle || "(not given)"}\n\nSolution / explanation:\n${userSolution.slice(0, 4000)}`,
        temperature: 0.3,
      },
      RateResponse,
      "interview/rate-solution",
    );
    return NextResponse.json(result);
  } catch (e) {
    logger.error("interview/rate-solution — AI unusable", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't rate the solution", retryable: true },
      { status: 500 },
    );
  }
}
