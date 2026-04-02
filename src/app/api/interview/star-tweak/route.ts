import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildSTARPrompt } from "@/lib/prompts";

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
  const body = (await req.json()) as Body;
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
    const aiResult = await callAI<{
      situation: string;
      task: string;
      action: string;
      result: string;
      improvementSuggestions?: string[];
      commonQuestionsThisAnswers?: string[];
    }>({
      systemPrompt,
      userMessage: "Improve the flow and clarity while keeping the same story.",
      temperature: 0.3,
    });

    const tips =
      aiResult.improvementSuggestions?.slice(0, 3) ?? ["Keep it under 2 minutes.", "Lead with the result when possible."];

    return NextResponse.json({
      situation: aiResult.situation,
      task: aiResult.task,
      action: aiResult.action,
      result: aiResult.result,
      tips,
    });
  } catch {
    return NextResponse.json({
      situation: rawStory.situation,
      task: rawStory.task,
      action: rawStory.action,
      result: rawStory.result,
      tips: ["Keep it under 2 minutes.", "Lead with the result when possible."],
    });
  }
}
