import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIValidated } from '@/lib/ai';
import { checkNaturalness } from '@/lib/ai/naturalness-check';
import { readBody, zShort, zText } from '@/lib/api';

/** The letter itself must come back non-empty — an empty string here used to
 *  sail through as a "successful" generation. */
const CoverLetterResponse = z
  .object({
    data: z
      .object({
        coverLetter: z.string().min(1),
        assumptions: z.array(z.string()).default([]),
        wordCount: z.number().optional(),
      })
      .catchall(z.unknown()),
  })
  .catchall(z.unknown());

const CoverLetterSchema = z.object({
  cvData: z.unknown().optional(),
  jobDescription: zText(),
  companyName: zShort(),
  directionStatement: zText(2000).optional(),
  region: zShort(20).optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = await readBody(req, CoverLetterSchema);
    if (!parsed.ok) return parsed.response;
    const { cvData, jobDescription, companyName, directionStatement, region } = parsed.data;
    if (!jobDescription || !companyName) {
      return NextResponse.json({ error: 'Job description and company name are required' }, { status: 400 });
    }

    const result = await callAIValidated({
      systemPrompt: `You are PathFinder's AI career mentor generating a tailored cover letter following TechTalk methodology.

RULES:
- Open with a specific hook about the company (NEVER "I'm writing to express my interest")
- Reference 2-3 specific experiences from the CV matching the job requirements
- Connect the student's Direction Statement to career motivation
- Under 300 words
- Specific enough it could NOT be sent to another company without changes
- Flag any assumptions you made about motivation
- End with: "Review and personalise this before sending. AI drafts the structure — you add the authenticity."

Company: ${companyName}
Direction: ${directionStatement || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk CV Blueprint - Cover Letter",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "coverLetter": string,
    "assumptions": string[],
    "wordCount": number,
    "editReminder": "Review and personalise this before sending. AI drafts the structure — you add the authenticity."
  }
}`,
      userMessage: `CV data:\n${typeof cvData === 'string' ? cvData : JSON.stringify(cvData || {})}`,
      temperature: 0.7,
    },
      CoverLetterResponse,
      'cover-letter/generate',
    );

    const coverLetterText = result.data.coverLetter;
    const naturalness = checkNaturalness(coverLetterText, {
      type: 'cover_letter',
      region: region === 'uk' || region === 'us' ? region : undefined,
    });

    return NextResponse.json({ ...result, naturalness });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Cover letter generation failed', retryable: true },
      { status: 500 }
    );
  }
}
