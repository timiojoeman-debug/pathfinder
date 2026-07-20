import { NextResponse } from "next/server";
import { z } from "zod";
import { readLoose } from "@/lib/api";
import { callAIValidated } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { buildSTARPrompt } from "@/lib/prompts";

/** Shape the prompt actually asks for — the refined story lives under `data`. */
const StarResponse = z.object({
  data: z.object({
    situation: z.string(),
    task: z.string(),
    action: z.string(),
    result: z.string(),
    tips: z.array(z.string()).optional(),
    mappedQuestions: z.array(z.string()).optional(),
    estimatedDuration: z.string().optional(),
  }),
});

type Body = {
  situation: string;
  task: string;
  action: string;
  result: string;
  category?: string;
};

const STAR_CATEGORIES = [
  "Challenge Overcome",
  "Teamwork",
  "Leadership/Initiative",
  "Failure/Learning",
  "Time Pressure",
] as const;

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data as Body;
  const { situation, task, action, result, category } = body;

  if (!situation && !task && !action && !result) {
    return NextResponse.json({ error: "Provide at least one STAR section" }, { status: 400 });
  }

  const rawStory = {
    situation: situation || "N/A",
    task: task || "N/A",
    action: action || "N/A",
    result: result || "N/A",
  };
  const cat =
    category && STAR_CATEGORIES.includes(category as (typeof STAR_CATEGORIES)[number])
      ? category
      : "Challenge Overcome";

  try {
    const systemPrompt = buildSTARPrompt(rawStory, cat);
    // Previously read `aiResult.situation` / `improvementSuggestions`, which the
    // prompt never returns — every field came back undefined and the refined
    // story was silently dropped, leaving only the canned tips.
    const aiResult = await callAIValidated(
      {
        systemPrompt,
        userMessage: "Improve the flow and clarity while keeping the same story.",
        temperature: 0.3,
      },
      StarResponse,
      "interview/star-tweak",
    );
    const d = aiResult.data;
    const tips = d.tips?.length
      ? d.tips.slice(0, 3)
      : ["Keep it under 2 minutes.", "Lead with the result when possible."];

    return NextResponse.json({
      situation: d.situation,
      task: d.task,
      action: d.action,
      result: d.result,
      tips,
    });
  } catch (e) {
    logger.error("interview/star-tweak — AI unusable, echoing the original story", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({
      situation: rawStory.situation,
      task: rawStory.task,
      action: rawStory.action,
      result: rawStory.result,
      tips: ["Keep it under 2 minutes.", "Lead with the result when possible."],
    });
  }
}
