import { NextResponse } from "next/server";
import { readLoose } from "@/lib/api";
import { callAI } from "@/lib/ai";

type Role = { company: string; role: string; jobDescription: string };
type Body = { roles?: Role[]; cvSummary?: string; direction?: string };

type AIResult = {
  roles: { company: string; fitReason: string; recommendedMove: string; requiredSkills: string[] }[];
  priorityMoves: { action: string; why: string; impact: string; kind: "cv" | "networking" | "jobs" | "interview" | "direction" }[];
};

const SYSTEM = `You are a career-intelligence engine for a university student targeting software-engineering internships. Analyse each role against the student's profile. Be concrete, specific, and honest — no motivation, no filler, no hedging.

Respond with STRICT JSON only, matching exactly:
{"roles":[{"company":"string","fitReason":"max 14 words — why this fit, citing a real gap or strength","recommendedMove":"max 5 words, imperative","requiredSkills":["3-5 key skills pulled from the JD"]}],"priorityMoves":[{"action":"max 8 words, imperative","why":"max 18 words, cite a number or specific reason","impact":"e.g. +14%, 4x odds, act now","kind":"cv|networking|jobs|interview|direction"}]}

Return exactly 3 priorityMoves, ranked by leverage (highest first).`;

export async function POST(req: Request) {
  let body: Body;
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    body = __p.data as Body;
  } catch {
    return NextResponse.json({ source: "heuristic", roles: [], priorityMoves: [] });
  }

  const roles = (body.roles ?? []).slice(0, 12);
  if (roles.length === 0) {
    return NextResponse.json({ source: "heuristic", roles: [], priorityMoves: [] });
  }

  const profile = `Target direction: ${body.direction?.trim() || "(not set)"}\nCV summary:\n${(body.cvSummary || "(none provided)").slice(0, 2500)}`;
  const roleList = roles
    .map((r, i) => `${i + 1}. ${r.company} — ${r.role}\n${(r.jobDescription || "").slice(0, 600)}`)
    .join("\n\n");

  try {
    const result = await callAI<AIResult>({
      systemPrompt: SYSTEM,
      userMessage: `STUDENT PROFILE:\n${profile}\n\nROLES TO ANALYSE:\n${roleList}`,
      temperature: 0.3,
    });
    return NextResponse.json({
      source: "ai",
      roles: Array.isArray(result.roles) ? result.roles.slice(0, 12) : [],
      priorityMoves: Array.isArray(result.priorityMoves) ? result.priorityMoves.slice(0, 3) : [],
    });
  } catch {
    // Graceful degradation — the client renders the deterministic model instead.
    return NextResponse.json({ source: "heuristic", roles: [], priorityMoves: [] });
  }
}
