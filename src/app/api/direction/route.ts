import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody } from "@/lib/api";
import { callAIValidated } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { buildDirectionPrompt } from "@/lib/prompts";

/** Shape the prompt actually asks for — the statement lives under `data`. */
const DirectionResponse = z.object({
  data: z.object({
    directionStatement: z.string(),
    specificityScore: z.number().optional(),
    specificityTier: z.string(),
    sharpeningSuggestions: z.array(z.string()).default([]),
  }),
});

/**
 * Every field below is `.trim()`-ed, so a non-string value used to throw and
 * return a bare 500 — and the app models a tech stack as `string[]`, which hit
 * exactly that path. Accept either a string or a string[], normalise to a
 * trimmed string, and reject anything else with a 400 instead of crashing.
 */
const flexText = z.preprocess((v) => {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(", ");
  if (typeof v === "string") return v;
  return "";
}, z.string().max(2000));

const DirectionSchema = z.object({
  industry: flexText,
  roleType: flexText,
  techStack: flexText,
  location: flexText,
  companySize: flexText,
  workMode: flexText,
});

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
  const __p = await readBody(req, DirectionSchema);
  if (!__p.ok) return __p.response;
  const input: DirectionInput = __p.data;

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
    // The prompt nests these under `data`; reading them off the root returned
    // undefined for every field, so the response collapsed to {suggestions:[]}.
    const aiResult = await callAIValidated(
      {
        systemPrompt,
        userMessage: "Generate the direction statement and assessment.",
        temperature: 0.3,
      },
      DirectionResponse,
      "direction",
    );
    return NextResponse.json({
      statement: aiResult.data.directionStatement,
      specificity: aiResult.data.specificityTier,
      suggestions: aiResult.data.sharpeningSuggestions ?? [],
    });
  } catch (e) {
    logger.error("direction — AI unusable, serving locally-derived statement", {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({
      statement,
      specificity: level,
      suggestions,
    });
  }
}

