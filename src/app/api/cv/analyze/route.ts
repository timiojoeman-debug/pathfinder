import { NextResponse } from "next/server";
import { z } from "zod";
import { AIError, callAIValidated } from "@/lib/ai";
import { buildCVAnalysisPrompt } from "@/lib/prompts";
import mammoth from "mammoth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** `buildCVAnalysisPrompt` asks for the methodology envelope: feedback,
 *  strengths and next steps at the root, the parsed CV under `data`. A read
 *  with nothing in any of them is a failed read, not an empty one. */
const CvReadResponse = z
  .object({
    feedback: z
      .array(
        z
          .object({
            issue: z.string().default(""),
            severity: z.string().optional(),
            suggestedFix: z.string().default(""),
          })
          .catchall(z.unknown()),
      )
      .default([]),
    strengths: z.array(z.string()).default([]),
    nextSteps: z.array(z.string()).default([]),
    data: z.object({ skills: z.array(z.string()).default([]) }).catchall(z.unknown()),
  })
  .catchall(z.unknown())
  .refine(
    (r) => r.feedback.length + r.strengths.length + r.nextSteps.length + r.data.skills.length > 0,
    "the CV read came back empty",
  );

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    try {
      // Import the library module directly, not the package entry point.
      // pdf-parse@1.1.1's index.js runs a debug block that reads a bundled
      // test fixture whenever `module.parent` is falsy — which is always true
      // under ESM — so `import("pdf-parse")` throws ENOENT before it parses
      // anything. Every PDF upload failed, and the friendly "Could not read
      // this PDF" response made it look like the student's file was at fault.
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdfParse(buffer);
      if (!data?.text || data.text.trim().length < 50) {
        return ''; // Will be caught below as "empty extraction"
      }
      return data.text;
    } catch (err) {
      logger.error("cv/analyze — PDF extraction failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return ''; // Will be caught below
    }
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch {
      return buffer.toString("utf-8", 0, Math.min(buffer.length, 50000));
    }
  }

  return file.text();
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");
  const textInput = formData.get("text");

  let rawText: string;
  let originalName: string;

  if (textInput && typeof textInput === "string" && textInput.trim().length > 0) {
    // Use the pasted text directly
    rawText = textInput.trim();
    originalName = "pasted-cv.txt";
  } else if (file instanceof File) {
    // File size validation — reject files over 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      );
    }

    originalName = file.name;
    rawText = await extractTextFromFile(file);
  } else {
    return NextResponse.json({ error: "Upload a CV file or paste your CV text" }, { status: 400 });
  }

  if (!rawText || rawText.trim().length < 50) {
    return NextResponse.json(
      {
        error: 'Could not read this PDF. Try saving it as a text-based PDF or paste your CV text directly.',
        extractionFailed: true
      },
      { status: 422 }
    );
  }

  const trimmed = rawText.slice(0, 8000);
  const parsed = { fileName: originalName, rawPreview: trimmed.slice(0, 1000), rawText: trimmed };

  // Parsing and the AI read share one call, so an AI failure must not throw
  // away the text just extracted. This used to serve a canned read ("Your
  // University", Python/JS/React/SQL, generic tips) that the page showed as a
  // reading of the student's own CV. Now the text comes back with an explicit
  // flag, and the page says the AI read is unavailable.
  try {
    const read = await callAIValidated(
      {
        systemPrompt: buildCVAnalysisPrompt(),
        userMessage: `CV filename: ${originalName}\n\nRaw content (may be noisy if PDF/DOCX):\n${trimmed}`,
      },
      CvReadResponse,
      "cv/analyze",
    );
    return NextResponse.json({ ...parsed, ...read });
  } catch (err) {
    logger.error("cv/analyze — AI read unavailable", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({
      ...parsed,
      aiUnavailable: true,
      aiMessage:
        err instanceof AIError && !err.available
          ? "The AI read isn't set up on this server, so only the local read is shown."
          : "The AI read didn't come back this time. Your text is safe; try again in a minute.",
    });
  }
}

