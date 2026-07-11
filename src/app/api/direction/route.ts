import { NextResponse } from "next/server";
import { readLoose } from "@/lib/api";
import { callAI } from "@/lib/ai";
import { buildDirectionPrompt } from "@/lib/prompts";

type DirectionInput = {
  industry: string;
  roleType: string;
  techStack: string;
  location: string;
  companySize: string;
  workMode: string;
};

type SpecificityLevel = "Too Vague" | "Somewhat Defined" | "Clear" | "Laser Focused";

function computeSpecificity(input: DirectionInput): { level: SpecificityLevel; suggestions: string[] } {
  const suggestions: string[] = [];
  let score = 0;

  if (input.industry.trim()) score += 1;
  else suggestions.push("Specify at least one target industry (e.g. fintech, healthtech, AI tooling).");

  if (input.roleType.trim()) score += 1;
  else suggestions.push("Define a primary role (e.g. Backend Engineering, ML Engineering, Product Management).");

  if (input.techStack.trim().split(/[,/ ]+/).filter(Boolean).length >= 2) score += 1;
  else suggestions.push("List 2–3 core technologies you want to use day‑to‑day.");

  if (input.location.trim()) score += 1;
  else suggestions.push("Choose at least one primary location even if you’re open to remote.");

  if (input.companySize.trim()) score += 1;
  else suggestions.push("Pick a company size range (e.g. early‑stage startup, scaleup, Big Tech).");

  if (input.workMode.trim()) score += 1;
  else suggestions.push("Clarify whether you prefer remote, hybrid, or onsite.");

  let level: SpecificityLevel = "Too Vague";
  if (score >= 5) level = "Laser Focused";
  else if (score === 4) level = "Clear";
  else if (score === 3) level = "Somewhat Defined";

  return { level, suggestions };
}

export async function POST(req: Request) {
  const __p = await readLoose(req);
  if (!__p.ok) return __p.response;
  const body = __p.data as Partial<DirectionInput>;

  const input: DirectionInput = {
    industry: body.industry ?? "",
    roleType: body.roleType ?? "",
    techStack: body.techStack ?? "",
    location: body.location ?? "",
    companySize: body.companySize ?? "",
    workMode: body.workMode ?? "",
  };

  const statementParts: string[] = [];

  if (input.roleType) {
    statementParts.push(input.roleType.trim());
  } else {
    statementParts.push("internship");
  }

  if (input.industry) {
    statementParts.push(`in ${input.industry.trim()}`);
  }

  if (input.companySize) {
    statementParts.push(`at ${input.companySize.trim()} companies`);
  } else {
    statementParts.push("at companies");
  }

  if (input.location) {
    statementParts.push(`in ${input.location.trim()}`);
  }

  if (input.workMode) {
    statementParts.push(`with a ${input.workMode.trim()} setup`);
  }

  let statement = `I'm targeting ${statementParts.join(" ")}.`;

  if (input.techStack) {
    statement += ` I want to work with ${input.techStack.trim()}.`;
  }

  const { level, suggestions } = computeSpecificity(input);

  try {
    const systemPrompt = buildDirectionPrompt({
      roleType: input.roleType,
      techStack: input.techStack,
      industry: input.industry,
      location: input.location,
      companySize: input.companySize,
      workMode: input.workMode,
    });
    const aiResult = await callAI<{
      directionStatement: string;
      specificityScore: number;
      specificityTier: string;
      sharpeningSuggestions: string[];
    }>({
      systemPrompt,
      userMessage: "Generate the direction statement and assessment.",
      temperature: 0.3,
    });
    return NextResponse.json({
      statement: aiResult.directionStatement,
      specificity: aiResult.specificityTier,
      suggestions: aiResult.sharpeningSuggestions ?? [],
    });
  } catch {
    return NextResponse.json({
      statement,
      specificity: level,
      suggestions,
    });
  }
}

