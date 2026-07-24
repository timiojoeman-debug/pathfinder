import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, zShort, zText } from "@/lib/api";
import { aiShape, callAIValidated } from "@/lib/ai";

/**
 * The cross-page mentor chat — advisory only.
 *
 * It reads the derived Career Profile and the recent event log as context and
 * answers questions about them. It cannot act: there is no tool calling here
 * and the client writes nothing from the reply back into the store. That is a
 * deliberate product decision, not a missing feature. The store is the record
 * of what a student has actually done, and an assistant that could write to it
 * would be able to manufacture progress from a misunderstanding — the one
 * thing the Career-OS design exists to prevent.
 *
 * So the assistant's job when asked to *do* something is to say where in the
 * product it happens. It points; the student acts.
 */

const MAX_TURNS = 12;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: zText(),
});

const ChatSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(MAX_TURNS * 2),
  context: z
    .object({
      directionStatement: zShort().optional(),
      targetRole: zShort().optional(),
      currentPhase: zShort().optional(),
      progressLines: z.array(zShort()).max(12).optional(),
      strengths: z.array(zShort()).max(12).optional(),
      weaknesses: z.array(zShort()).max(12).optional(),
      currentSkills: z.array(zShort()).max(20).optional(),
      missingSkills: z.array(zShort()).max(20).optional(),
      recentActivity: z.array(zText()).max(12).optional(),
    })
    .optional(),
});

const ChatResponse = aiShape(z.object({ reply: z.string().min(1) }));

const SYSTEM = `You are PathFinder's career mentor, talking to a university student hunting for a software internship. You can see their profile and recent activity. You answer questions; you cannot change anything in the app.

WHAT YOU KNOW:
Only the profile facts given to you below and what the student tells you in this conversation. Nothing else about them.

ABSOLUTE RULES:
- Never invent a fact about the student — no skill, project, application, company, or number that is not in the context or the conversation.
- Never state or estimate a score, percentage, or count that was not supplied. If asked for one you do not have, say what would produce it.
- Never claim you have done something in the app. You cannot upload a CV, save a job, send a message, or tick a problem. Say where the student does it.
- Never predict outcomes or odds of getting a role. You do not know.
- If the profile is empty or the question needs information you were not given, say so and ask for the one thing that would help most.
- Do not flatter. A student with no CV analysed and no outreach sent should hear that plainly.

WHERE THINGS HAPPEN — route the student to the right page:
- Career direction and target role: the Direction page
- CV text, ATS audit, job match, project ideas, LinkedIn review: the CV page
- Searching and saving roles: the Opportunity Discovery page
- Outreach, coffee-chat prep, follow-ups, referrals: the Networking page
- LeetCode, STAR stories, likely questions, company briefings, post-interview reflection: the Interview page
- Application pipeline: the Tracker page

STYLE:
- UK spelling. Direct, warm, concrete. Second person.
- Under 130 words unless genuinely asked to go deeper. Most answers are 2-4 sentences.
- Plain prose. Use a short list only when the answer is genuinely a list.
- The methodology weights networking and interview prep most heavily — that is where referrals and offers actually come from. Reflect that when asked what to do next.

Respond ONLY with valid JSON: {"reply": "your answer"}`;

/** The profile as a compact brief. Sections with nothing in them are omitted
 *  rather than sent empty, so the model is not invited to fill a blank. */
function buildContext(c: NonNullable<z.infer<typeof ChatSchema>["context"]>): string {
  const section = (label: string, items?: string[]) =>
    items?.length ? `${label}: ${items.join("; ")}` : null;

  const lines = [
    c.directionStatement ? `Direction: ${c.directionStatement}` : "Direction: not set yet",
    c.targetRole ? `Target role: ${c.targetRole}` : null,
    c.currentPhase ? `Current phase: ${c.currentPhase}` : null,
    section("Progress (quote exactly, invent none)", c.progressLines),
    section("Strengths", c.strengths),
    section("Gaps", c.weaknesses),
    section("Skills evidenced in CV", c.currentSkills),
    section("Skills missing vs target", c.missingSkills),
    section("Recent activity", c.recentActivity),
  ].filter(Boolean);

  return lines.length > 1 ? lines.join("\n") : "This student has not recorded anything yet.";
}

export async function POST(req: Request) {
  const parsed = await readBody(req, ChatSchema);
  if (!parsed.ok) return parsed.response;
  const { messages, context } = parsed.data;

  // Keep the most recent turns; an unbounded history is a slow, expensive
  // prompt that mostly repeats itself.
  const recent = messages.slice(-MAX_TURNS);
  const transcript = recent
    .map((m) => `${m.role === "user" ? "Student" : "Mentor"}: ${m.content}`)
    .join("\n\n");

  try {
    const result = await callAIValidated(
      {
        systemPrompt: SYSTEM,
        userMessage: `THEIR PROFILE:\n${context ? buildContext(context) : "No profile data supplied."}\n\nCONVERSATION SO FAR:\n${transcript}\n\nReply to the student's last message.`,
        temperature: 0.6,
      },
      ChatResponse,
      "mentor/chat",
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The mentor could not answer just now", retryable: true },
      { status: 500 },
    );
  }
}
