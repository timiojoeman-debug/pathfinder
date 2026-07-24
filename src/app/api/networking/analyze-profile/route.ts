import { NextResponse } from "next/server";
import { z } from "zod";
import { readLoose } from "@/lib/api";
import { aiShape, callAIValidated } from "@/lib/ai";
import { logger } from "@/lib/logger";

/**
 * Read a target's public profile (LinkedIn, Glassdoor, etc.) — pasted by the
 * student — and pull out real connection points and outreach angles.
 *
 * The `summary` field carries the load here: it is meant to reflect the profile
 * the student pasted. The previous fallback returned "Analysis complete" with a
 * set of generic angles ("University alumni", "Similar role experience") that
 * had nothing to do with the person in front of them — a made-up reading served
 * as though the profile had been analysed. This validates the response and
 * fails visibly instead, so a student is never handed invented common ground to
 * open a real conversation with.
 */

const AnalysisResponse = aiShape(
  z.object({
    summary: z.string().min(1),
    connectionPoints: z.array(z.string()).default([]),
    outreachAngles: z.array(z.string()).default([]),
    conversationStarters: z.array(z.string()).default([]),
  }),
);

type AnalyzeBody = {
  jobSites?: string[];
  about?: string;
  experience?: string;
  education?: string;
  skills?: string;
  recentPosts?: string;
  recipientName?: string;
  roleTitle?: string;
  company?: string;
};

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data as AnalyzeBody;
  const jobSites = body.jobSites ?? [];
  const profileContent = [
    body.about && `[About]\n${body.about}`,
    body.experience && `[Experience]\n${body.experience}`,
    body.education && `[Education]\n${body.education}`,
    body.skills && `[Skills]\n${body.skills}`,
    body.recentPosts && `[Recent posts/activity]\n${body.recentPosts}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!profileContent.trim()) {
    return NextResponse.json(
      { error: "Provide at least one section (About, Experience, Education, Skills)" },
      { status: 400 },
    );
  }

  const sitesNote = jobSites.length ? `Target is present on: ${jobSites.join(", ")}.` : "";

  try {
    const result = await callAIValidated(
      {
        systemPrompt:
          "Analyse a target's professional profile that the student pasted (from LinkedIn, Glassdoor, Indeed, etc.). Extract only what the profile actually supports: 1) a short factual summary, 2) genuine shared connection points (university, location, interests, tech stack, culture) — omit any you cannot see evidence for, 3) personalised outreach angles grounded in their profile, 4) 3-5 conversation starters. Never invent a shared attribute. Return JSON: { summary, connectionPoints (array), outreachAngles (array), conversationStarters (array) }.",
        userMessage: `${sitesNote}\n\nProfile content:\n${profileContent.slice(0, 10000)}\n\nTarget role: ${body.roleTitle || "internship"} at ${body.company || "company"}. Recipient: ${body.recipientName || "contact"}.`,
        temperature: 0.4,
      },
      AnalysisResponse,
      "networking/analyze-profile",
    );
    return NextResponse.json(result);
  } catch (e) {
    logger.error("networking/analyze-profile — AI unusable", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't analyse that profile", retryable: true },
      { status: 500 },
    );
  }
}
