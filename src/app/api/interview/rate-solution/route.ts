import { NextResponse } from "next/server";
import { generateWithAI } from "@/lib/ai";

type Body = {
  problemTitle: string;
  userSolution: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

  const { content } = await generateWithAI(
    {
      systemPrompt:
        "Rate a user's coding solution. Consider: time complexity, space complexity, code lines/clarity. Return JSON: { timeComplexity, spaceComplexity, lineCount, rating (1-10), feedback (string), topTwoApproaches (array of 2 strings describing the 2 most efficient approaches) }.",
      userPrompt: `Problem: ${body.problemTitle}\n\nUser's solution/explanation:\n${body.userSolution}`,
    },
    () =>
      JSON.stringify({
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        lineCount: 15,
        rating: 8,
        feedback: "Solid approach. Consider edge cases.",
        topTwoApproaches: [
          "Optimal: O(n) time, O(1) space using two pointers.",
          "Alternative: O(n) time, O(n) space using hash map.",
        ],
      }),
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  return NextResponse.json(parsed);
}
