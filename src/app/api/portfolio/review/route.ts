import { NextResponse } from 'next/server';
import { readLoose } from "@/lib/api";
import { aiEnvelope, callAIValidated } from "@/lib/ai";
import { buildPortfolioReviewPrompt } from "@/lib/prompts/cv-prompts";
import { findGenericAbout } from "@/lib/methodology/recruiter-signals";

/**
 * Reviews a student's project portfolio against the standout-project qualities.
 *
 * Paste-in, not fetch-by-URL: the app does not scrape, and asking a model to
 * describe a GitHub/portfolio from a URL alone is how you get invented projects.
 * The URL is passed as context only; the review is grounded solely in the text
 * the student pasted, and the route fails visibly rather than fabricating.
 */
export async function POST(req: Request) {
  try {
    const __p = await readLoose(req);
    if (!__p.ok) return __p.response;
    const { portfolioText, portfolioUrl, targetRole, techStack } = __p.data;

    const text = typeof portfolioText === "string" ? portfolioText.trim() : "";
    if (text.length < 40) {
      return NextResponse.json(
        { error: 'Paste your project descriptions, GitHub READMEs or portfolio text (40+ characters) so there is something real to review.' },
        { status: 400 },
      );
    }

    const stack = Array.isArray(techStack) ? techStack.filter((t): t is string => typeof t === "string") : [];
    const url = typeof portfolioUrl === "string" ? portfolioUrl.trim() : "";

    const result = await callAIValidated(
      {
        systemPrompt: buildPortfolioReviewPrompt(
          typeof targetRole === "string" ? targetRole.trim() : "",
          stack,
        ),
        userMessage: `${url ? `Portfolio/GitHub link (context only — do not fabricate anything from it): ${url}\n\n` : ""}Portfolio content the student pasted:\n${text.slice(0, 6000)}`,
        temperature: 0.3,
      },
      aiEnvelope(["overallImpression"]),
      "portfolio/review",
    );

    // Deterministic, so the flag never depends on the model noticing.
    return NextResponse.json({ ...result, genericPhrases: findGenericAbout(text) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Portfolio review failed', retryable: true },
      { status: 500 },
    );
  }
}
