import { NextResponse } from "next/server";
import { generateWithAI } from "@/lib/ai";
import { buildCVAnalysisPrompt } from "@/lib/prompts";
import mammoth from "mammoth";

export const runtime = "nodejs";

async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data?.text || "";
    } catch {
      return buffer.toString("utf-8", 0, Math.min(buffer.length, 50000));
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing CV file" }, { status: 400 });
  }

  const originalName = file.name;
  const rawText = await extractTextFromFile(file);
  const trimmed = rawText.slice(0, 8000);

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

  let parsed: any;
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
    ...parsed,
  });
}

