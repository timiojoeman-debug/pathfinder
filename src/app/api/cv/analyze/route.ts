import { NextResponse } from "next/server";
import { generateWithAI, AIError } from "@/lib/ai";
import { buildCVAnalysisPrompt } from "@/lib/prompts";
import mammoth from "mammoth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

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

  try {
    const { content } = await generateWithAI(
      {
        systemPrompt: buildCVAnalysisPrompt(),
        userPrompt: `CV filename: ${originalName}\n\nRaw content (may be noisy if PDF/DOCX):\n${trimmed}`,
      },
      () =>
        JSON.stringify({
          education: [
            {
              institution: "Your University",
              degree: "BSc Computer Science",
              period: "2023 – 2026",
            },
          ],
          experience: [],
          projects: [],
          skills: ["Python", "JavaScript", "React", "SQL"],
          suggestions: {
            bulletPoints: [
              "Start bullets with strong action verbs and quantify your impact (e.g. 'Reduced page load time by 30% by optimizing API calls').",
            ],
            keywords: [
              "APIs",
              "databases",
              "unit testing",
              "cloud platforms (AWS / GCP / Azure)",
            ],
            formatting: [
              "Keep your CV to one page for internships and align dates on the right for easy scanning.",
            ],
            extraQualifications: [
              "Consider a cloud fundamentals certificate and one or two LeetCode-style problem solving badges.",
            ],
          },
        }),
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        education: [],
        experience: [],
        projects: [],
        skills: [],
        suggestions: {
          bulletPoints: [],
          keywords: [],
          formatting: [],
          extraQualifications: [],
        },
      };
    }

    return NextResponse.json({
      fileName: originalName,
      rawPreview: trimmed.slice(0, 1000),
      rawText: trimmed,
      ...parsed,
    });
  } catch (err) {
    if (err instanceof AIError) {
      return NextResponse.json(
        { error: err.message, retryable: err.retryable, available: err.available },
        { status: err.status === 0 ? 503 : err.status }
      );
    }
    throw err;
  }
}
