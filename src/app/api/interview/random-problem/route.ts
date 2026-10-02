import { NextResponse } from "next/server";
import { readLoose } from "@/lib/api";
import { generateWithAI } from "@/lib/ai";

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data as { completedIds?: string[] };
  const completedIds = new Set(body.completedIds ?? []);

  const { content } = await generateWithAI(
    {
      route: "interview/random-problem",
      systemPrompt:
        "Generate ONE random LeetCode-style coding problem suitable for interview prep. Return JSON: { title, description, difficulty: 'Easy'|'Medium'|'Hard', category, leetcodeUrl (or similar), hints (array of 2 strings) }. Avoid problems whose IDs might be in completedIds.",
      userPrompt: `Completed problem IDs (avoid similar): ${[...completedIds].join(", ")}. Generate a fresh problem.`,
    },
    () =>
      JSON.stringify({
        title: "Valid Parentheses",
        description: "Given a string s containing just '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        difficulty: "Easy",
        category: "Stack",
        leetcodeUrl: "https://leetcode.com/problems/valid-parentheses/",
        hints: ["Use a stack to match opening and closing brackets.", "Handle edge cases: empty string, odd length."],
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
