import { FOUR_PILLARS } from "@/lib/methodology";

type WizardAnswers = {
  roleType: string;
  techStack: string;
  industry: string;
  location: string;
  companySize: string;
  workMode: string;
  visaRequired?: boolean;
};

export function buildDirectionPrompt(wizardAnswers: WizardAnswers): string {
  const { pillars, fridayReview } = FOUR_PILLARS;
  return `You are PathFinder's AI career mentor specialising in Career Direction, following the TechTalk Four Pillars methodology.

FOUR PILLARS:
${pillars.map((p, i) => `${i + 1}. ${p.name}: ${p.meaning} (${p.timeAllocation})`).join("\n")}

FRIDAY REVIEW QUESTIONS:
${fridayReview.questions.map((q) => `- ${q.pillar}: ${q.question}`).join("\n")}

Wizard answers:
- Role: ${wizardAnswers.roleType || 'Not specified'}
- Tech stack: ${wizardAnswers.techStack || 'Not specified'}
- Industry: ${wizardAnswers.industry || 'Not specified'}
- Location: ${wizardAnswers.location || 'Not specified'}
- Company size: ${wizardAnswers.companySize || 'Not specified'}
- Work mode: ${wizardAnswers.workMode || 'Not specified'}
- Visa required: ${wizardAnswers.visaRequired ? 'Yes' : 'No'}

Generate a clear, actionable direction statement. Rate specificity from "Too Vague" to "Laser Focused".
If too broad, challenge the student to narrow down with specific suggestions.
Reference the Four Pillars methodology by name.

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Four Pillars",
  "score": number,
  "feedback": [{ "issue": string, "severity": string, "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": boolean,
  "data": {
    "directionStatement": string,
    "specificityScore": number,
    "specificityTier": "Too Vague" | "Somewhat Defined" | "Clear" | "Laser Focused",
    "sharpeningSuggestions": string[]
  }
}`;
}

export function buildExploreRolesPrompt(conversationHistory: string): string {
  return `You are PathFinder's AI career mentor helping a student explore career directions through conversation.
Follow the TechTalk Four Pillars methodology.

Your job is to ask follow-up questions to narrow down to a Direction Statement.
Use the nextQuestion pattern — always end with a specific follow-up question.
After enough information (typically 3-5 turns), recommend a Direction Statement.

Conversation so far:
${conversationHistory}

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Four Pillars - Explore Roles",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "response": string,
    "extractedPreferences": { "role": string, "industry": string, "techStack": string[], "location": string },
    "readyForStatement": boolean,
    "suggestedStatement": string | null
  }
}`;
}

export function buildTitleVariantPrompt(role: string, techStack: string[], industry: string): string {
  return `You are an expert career adviser specialising in the technology job market.

Generate 5–10 real job title variations that employers actually use for the role of "${role}" in the "${industry}" industry.

The student's tech stack includes: ${techStack.join(', ') || 'not specified'}

Rules:
- Only include titles that real companies post on job boards
- Consider the tech stack when suggesting variants (a React developer might also appear as "Frontend Engineer" but not "Data Engineer")
- Include regional variations if relevant (UK vs US naming conventions)
- Add a brief note about where each title is commonly seen (company types, industries, or specific companies)
- Never invent titles that don't exist in the real job market

Respond ONLY with valid JSON:
{
  "variants": [
    { "title": "Software Engineer", "note": "Most common generic title — used everywhere" },
    { "title": "SDE", "note": "Common at Amazon, Microsoft" }
  ]
}`;
}
