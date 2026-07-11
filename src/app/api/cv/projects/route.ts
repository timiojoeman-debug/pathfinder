import { NextResponse } from "next/server";
import { readLoose } from "@/lib/api";
import { callAI } from "@/lib/ai";
import { buildProjectPrompt } from "@/lib/prompts";

const FALLBACK_PROJECTS = {
  projects: [
    {
      title: "Internship Application Tracker Dashboard",
      description: "A full‑stack web app to track internship applications using tech from your gaps.",
      techStack: ["Next.js", "TypeScript", "PostgreSQL", "TailwindCSS"],
      keyFeatures: [
        "Kanban board for application stages",
        "CV‑job keyword matching view",
        "Email template library for recruiter outreach",
      ],
      talkingPoints: [
        "How you modelled the data and chose indexes.",
        "How you designed reusable components.",
        "Trade‑offs between client and server rendering.",
      ],
    },
    {
      title: "Interview Prep Workspace",
      description: "A tool for LeetCode progress and STAR stories using missing tech.",
      techStack: ["React", "Node.js", "MongoDB"],
      keyFeatures: [
        "LeetCode progress tracker",
        "STAR story templates",
        "Spaced-repetition flashcards",
      ],
      talkingPoints: [
        "How you structured the backend API.",
        "How you ensured UI responsiveness.",
        "Authentication and data protection.",
      ],
    },
    {
      title: "Job Feed Aggregator API",
      description: "Aggregates listings and ranks by fit using public APIs.",
      techStack: ["Node.js", "TypeScript", "REST APIs"],
      keyFeatures: [
        "Connects to public job APIs",
        "Scoring by skills and location",
        "Daily digest or dashboard",
      ],
      talkingPoints: [
        "Rate limits and API failure handling.",
        "Scoring logic improvements.",
        "API integration tests.",
      ],
    },
  ],
};

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data;
  const skills: string[] = body.skills ?? [];
  const targetRole: string = body.targetRole ?? "software engineering internship";
  const gaps: string[] = body.gaps ?? [];

  try {
    const systemPrompt = buildProjectPrompt(gaps, skills, targetRole);
    const aiResult = await callAI<{ projects?: { title: string; description: string; techStack: string[]; keyFeatures: string[]; talkingPoints: string[] }[] }>({
      systemPrompt,
      userMessage: `Design 3 projects that use the missing technologies and frameworks to close gaps. Each project should help the student learn and showcase the skills they lack.`,
      temperature: 0.3,
    });
    const projects = aiResult.projects ?? [];
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json(FALLBACK_PROJECTS);
  }
}
