import { NextResponse } from "next/server";
import { readLoose } from "@/lib/api";
import { generateWithAI } from "@/lib/ai";

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
      { status: 400 }
    );
  }

  const sitesNote = jobSites.length ? `Target is present on: ${jobSites.join(", ")}.` : "";

  const { content } = await generateWithAI(
    {
      systemPrompt:
        "Analyze a target's profile (LinkedIn, Glassdoor, Indeed, etc.). Extract: 1) key facts and summary, 2) shared connection points (university, location, interests, tech stack, culture), 3) personalized outreach angles, 4) 3-5 conversation starters. Use About, Experience, Education, Skills, and recent posts. Return JSON: summary, connectionPoints, outreachAngles, conversationStarters.",
      userPrompt: `${sitesNote}\n\nProfile content:\n${profileContent.slice(0, 10000)}\n\nTarget role: ${body.roleTitle || "internship"} at ${body.company || "company"}. Recipient: ${body.recipientName || "contact"}.`,
    },
    () =>
      JSON.stringify({
        summary: "Analysis complete. Use the insights to personalize your outreach.",
        connectionPoints: ["University alumni", "Similar role experience", "Shared tech interests"],
        outreachAngles: [
          "Reference a specific project or achievement from their profile",
          "Mention shared university or location",
          "Ask about their career path into the role",
        ],
        conversationStarters: [
          "How did you get into [their role] at [company]?",
          "What do you enjoy most about working there?",
          "Any advice for someone preparing for internships?",
        ],
      })
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    parsed = {
      summary: "Analysis complete.",
      connectionPoints: [],
      outreachAngles: [],
      conversationStarters: [],
    };
  }

  return NextResponse.json(parsed);
}
