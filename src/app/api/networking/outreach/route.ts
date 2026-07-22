import { NextResponse } from "next/server";
import { z } from "zod";
import { callAIValidated, aiShape } from "@/lib/ai";
import { runMentorEngine } from "@/lib/ai/mentor-engine";
import { getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { buildOutreachPrompt } from "@/lib/prompts";
import { checkNaturalness } from "@/lib/ai/naturalness-check";
import { readBody, zShort, zText } from "@/lib/api";

/** The prompt asks for these fields nested under `data`, but the model
 *  sometimes flattens them to the root. `aiShape` tolerates both so the route
 *  reads real content instead of silently shipping the empty fallback (a 200
 *  with nothing to send — the failure this validation exists to catch). */
const OutreachResponse = aiShape(
  z.object({
    message: z.string().min(1),
    questions: z.array(z.string()).optional(),
    topics: z.array(z.string()).optional(),
    followUp: z.string().optional(),
  }),
);

/**
 * The mentor engine registers each persona separately, all as RAG features in
 * the networking domain — so routing through it retrieves the outreach
 * methodology already embedded in `methodology_chunks`.
 */
const MENTOR_FEATURE = {
  recruiter: "outreach-recruiter",
  hiringManager: "outreach-hiring-manager",
  peer: "outreach-peer",
} as const;

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
    const userMessage =
      "Generate the outreach message, 5 coffee chat questions, 5 conversation topics, and a follow-up template. Personalise using the contact profile.";

    // Three tiers, each strictly better than the one below it:
    //   1. mentor engine — this student's real context (direction, CV skills,
    //      who they have already contacted) plus the outreach methodology
    //      retrieved from pgvector, with the exchange logged to ai_interactions
    //      so later phases can say "last time you...";
    //   2. a direct one-shot call — no context, no methodology, still real AI;
    //   3. the fallback template, in the catch below.
    // Any failure in tier 1 drops to tier 2 rather than failing the request.
    let aiResult: z.infer<typeof OutreachResponse> | null = null;

    try {
      // Reading the session can itself fail (no request context, expired
      // cookie); that must cost us the context, not the whole response.
      const user = await getAuthUser();
      if (user?.userId && isSupabaseConfigured()) {
        const mentor = await runMentorEngine({
          userId: user.userId,
          feature: MENTOR_FEATURE[body.type],
          featurePrompt: systemPrompt,
          userMessage,
        });
        // The engine returns the methodology envelope; aiShape reads the
        // outreach payload out of `data`.
        const parsed = OutreachResponse.safeParse(mentor);
        if (parsed.success) {
          aiResult = parsed.data;
          // Which tier served the response is worth knowing: the engine
          // failing is invisible otherwise, since tier 2 still returns
          // perfectly good copy.
          logger.info("networking/outreach — served by mentor engine", {
            feature: MENTOR_FEATURE[body.type],
          });
        } else {
          logger.warn("networking/outreach — mentor engine returned an unusable shape, falling back to a direct call", {
            issue: parsed.error.issues[0]?.message,
          });
        }
      }
    } catch (e) {
      logger.warn("networking/outreach — mentor engine unavailable, falling back to a direct call", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    if (!aiResult) {
      logger.info("networking/outreach — served by a direct call (no mentor context)");
      aiResult = await callAIValidated(
        { systemPrompt, userMessage, temperature: 0.3 },
        OutreachResponse,
        "networking/outreach",
      );
    }

    const messageText = aiResult.message;
    const naturalness = checkNaturalness(messageText, { type: 'outreach' });

    return NextResponse.json({
      message: messageText,
      questions: aiResult.questions ?? FALLBACK_OUTREACH.questions,
      topics: aiResult.topics ?? FALLBACK_OUTREACH.topics,
      followUp: aiResult.followUp ?? FALLBACK_OUTREACH.followUp,
      naturalness,
    });
  } catch (e) {
    logger.error("networking/outreach — AI unusable, serving fallback template", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(FALLBACK_OUTREACH);
  }
}
