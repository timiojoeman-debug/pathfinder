import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildInterviewQuestionsPrompt } from "@/lib/prompts";

type InterviewBody = {
  cvSummary?: string;
  targetRole?: string;
  more?: boolean;
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
      question: "On your resume you list a project using React. Walk me through one technical challenge you faced.",
      answerTemplate:
        "Context, the specific challenge, options considered, decision and outcome. Highlight trade-offs and lessons.",
    },
  ],
};

export async function POST(req: Request) {
  const body = (await req.json()) as InterviewBody;
  const count = body.more ? 4 : 2;
  const cvData = body.cvSummary || "N/A";
  const targetRole = body.targetRole || "Software Engineering Intern";

  try {
    const systemPrompt = buildInterviewQuestionsPrompt(cvData, targetRole);
    const aiResult = await callAI<{
      questions?: { question: string; category: string; answerTemplate: string; tips?: string[] }[];
    }>({
      systemPrompt,
      userMessage: `Generate ${count} random questions per type (${count * 4} total) across Behavioral, Technical, Situational, and CV-Specific. Vary the questions - do not repeat common ones.`,
      temperature: 0.7,
    });

    const questions = (aiResult.questions ?? []).map((q) => ({
      type: q.category,
      question: q.question,
      answerTemplate: q.answerTemplate,
    }));

    return NextResponse.json({
      questions: questions.length > 0 ? questions : FALLBACK_QUESTIONS.questions,
    });
  } catch {
    return NextResponse.json(FALLBACK_QUESTIONS);
  }
}
