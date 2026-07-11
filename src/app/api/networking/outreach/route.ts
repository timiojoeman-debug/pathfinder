import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI } from "@/lib/ai";
import { buildOutreachPrompt } from "@/lib/prompts";
import { checkNaturalness } from "@/lib/ai/naturalness-check";
import { readBody, zShort, zText } from "@/lib/api";

const OutreachSchema = z.object({
  type: z.enum(["recruiter", "hiringManager", "peer"]),
  recipientName: zShort().optional(),
  senderName: zShort().optional(),
  roleTitle: zShort().optional(),
  company: zShort().optional(),
  technologies: zShort(1000).optional(),
  sharedAttributes: zText(2000).optional(),
  profileInsights: z.object({
    summary: zText(2000).optional(),
    connectionPoints: z.array(zShort()).max(20).optional(),
    outreachAngles: z.array(zShort()).max(20).optional(),
  }).optional(),
});

const FALLBACK_OUTREACH = {
  message: "",
  questions: [
    "What do successful interns at your company typically have on their CV or portfolio?",
    "How do internship applications usually get reviewed and shortlisted?",
    "What projects or technologies are most important for this team over the next 6–12 months?",
    "If you were in my position, how would you spend the next 4–8 weeks preparing?",
    "Is there anyone else you'd recommend I speak with as I explore this path?",
  ],
  topics: [
    "Recent product launches or engineering blog posts from the company",
    "How new grads or interns are onboarded and mentored",
    "Technical stack and how teams collaborate across functions",
    "Career paths from intern to full‑time engineer at the company",
    "Any university or regional communities tied to the company",
  ],
  followUp:
    "Hi again NAME, just wanted to gently follow up on my previous note in case it got buried. No rush at all – I'd still be very grateful for any quick advice you can share around internships at COMPANY.",
};

export async function POST(req: Request) {
  const parsed = await readBody(req, OutreachSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const studentProfile = [
    `Sender: ${body.senderName || "Student"}`,
    `Target role: ${body.roleTitle || "intern role"}`,
    `Technologies: ${body.technologies || "N/A"}`,
  ].join("; ");

  const contactProfile = [
    `Recipient: ${body.recipientName || "Unknown"}`,
    `Company: ${body.company || "the company"}`,
    body.sharedAttributes ? `Shared attributes: ${body.sharedAttributes}` : "",
    body.profileInsights
      ? `Profile insights: Summary: ${body.profileInsights.summary || "N/A"}; Connection points: ${(body.profileInsights.connectionPoints ?? []).join("; ")}; Outreach angles: ${(body.profileInsights.outreachAngles ?? []).join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("; ");

  try {
    const systemPrompt = buildOutreachPrompt({
      studentProfile,
      contactProfile,
      contactType: body.type,
      roleName: body.roleTitle || "intern role",
    });
    const aiResult = await callAI<{
      message: string;
      questions?: string[];
      topics?: string[];
      followUp?: string;
    }>({
      systemPrompt,
      userMessage: `Generate the outreach message, 5 coffee chat questions, 5 conversation topics, and a follow-up template. Personalise using the contact profile.`,
      temperature: 0.3,
    });

    const messageText = aiResult.message ?? FALLBACK_OUTREACH.message;
    const naturalness = checkNaturalness(messageText, { type: 'outreach' });

    return NextResponse.json({
      message: messageText,
      questions: aiResult.questions ?? FALLBACK_OUTREACH.questions,
      topics: aiResult.topics ?? FALLBACK_OUTREACH.topics,
      followUp: aiResult.followUp ?? FALLBACK_OUTREACH.followUp,
      naturalness,
    });
  } catch {
    return NextResponse.json(FALLBACK_OUTREACH);
  }
}
