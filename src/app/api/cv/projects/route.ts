import { NextResponse } from "next/server";
import { z } from "zod";
import { readLoose } from "@/lib/api";
import { callAIValidated } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { buildProjectPrompt } from "@/lib/prompts";

/** Shape the prompt actually asks the model for (projects live under `data`). */
const ProjectsResponse = z.object({
  data: z.object({
    projects: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
          problemItSolves: z.string().optional(),
          techStack: z.array(z.string()).default([]),
          keyFeatures: z.array(z.string()).default([]),
          weeklyPlan: z.array(z.unknown()).optional(),
          qualityChecklist: z.array(z.unknown()).optional(),
          talkingPoints: z.array(z.string()).default([]),
        }),
      )
      .min(1),
  }),
});

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
    // The prompt asks for the projects nested under `data` — reading them off
    // the root silently produced an empty array while the model was in fact
    // returning good content. Validated so a shape change throws instead.
    const aiResult = await callAIValidated(
      {
        systemPrompt,
        userMessage: `Design 3 projects that use the missing technologies and frameworks to close gaps. Each project should help the student learn and showcase the skills they lack.`,
        temperature: 0.3,
      },
      ProjectsResponse,
      "cv/projects",
    );
    return NextResponse.json({ projects: aiResult.data.projects });
  } catch (e) {
    logger.error("cv/projects — AI unusable, serving fallback projects", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(FALLBACK_PROJECTS);
  }
}
