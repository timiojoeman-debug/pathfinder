import { NextResponse } from "next/server";
import { readLoose } from "@/lib/api";
import { z } from "zod";
import { callAIValidated, aiShape } from "@/lib/ai";
import { logger } from "@/lib/logger";

/** The prompt nests `questions` under `data` and labels each item's kind
 *  `type` (not `category`); the model sometimes flattens to the root.
 *  `aiShape` tolerates both nestings, and the field is read as `type`. */
const QuestionsResponse = aiShape(
  z.object({
    questions: z
      .array(
        z.object({
          question: z.string().min(1),
          type: z.string().default("General"),
          answerTemplate: z.string().default(""),
          tips: z.array(z.string()).optional(),
        }),
      )
      .min(1),
  }),
);
import { buildInterviewQuestionsPrompt } from "@/lib/prompts";

type InterviewBody = {
  cvSummary?: string;
  targetRole?: string;
  more?: boolean;
  /** "Give me harder ones" — the prompt raises the bar, not just the count. */
  difficulty?: "harder";
};

const FALLBACK_QUESTIONS = {
  questions: [
    {
      type: "Behavioral",
      question: "Tell me about a time you worked on a challenging project with a tight deadline.",
      answerTemplate:
        "Use STAR: Situation and Task briefly, focus on Actions (break down work, communicate, manage scope), end with measurable Result.",
    },
    {
      type: "Technical",
      question: "How would you design an API for an internship application tracker?",
      answerTemplate:
        "Outline entities (users, applications, stages), key endpoints (CRUD, stage moves), security, pagination, error handling.",
    },
    {
      type: "Situational",
      question: "A design disagreement on your team is blocking progress. How would you resolve it?",
      answerTemplate:
        "Gather data and trade-offs, propose time-boxed experiment if feasible, facilitate a decision, know when to escalate.",
    },
    {
      type: "CV-Specific",
      question: "Pick one project on your CV and walk me through the hardest technical problem in it.",
      answerTemplate:
        "Context, the specific challenge, options considered, decision and outcome. Highlight trade-offs and lessons.",
    },
  ],
};

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data as InterviewBody;
  const count = body.more ? 4 : 2;
  const cvData = body.cvSummary || "N/A";
  const targetRole = body.targetRole || "Software Engineering Intern";
  const harder = body.difficulty === "harder";

  try {
    const systemPrompt = buildInterviewQuestionsPrompt(cvData, targetRole, harder ? "harder" : "standard");
    const aiResult = await callAIValidated({
      systemPrompt,
      userMessage: `Generate ${count} random questions per type (${count * 4} total) across Behavioral, Technical, Situational, and CV-Specific. Vary the questions - do not repeat common ones.${harder ? " This is the harder round: every question should be tougher than a first-round screen." : ""}`,
      temperature: 0.7,
    },
      QuestionsResponse,
      "interview/questions",
    );

    const questions = aiResult.questions.map((q) => ({
      type: q.type,
      question: q.question,
      answerTemplate: q.answerTemplate,
    }));

    return NextResponse.json({ questions, source: "ai" });
  } catch (e) {
    logger.error("interview/questions — AI unusable, serving fallback questions", {
      error: e instanceof Error ? e.message : String(e),
    });
    // Flagged so the client says these are generic, not generated for this student.
    return NextResponse.json({ ...FALLBACK_QUESTIONS, source: "fallback" });
  }
}
