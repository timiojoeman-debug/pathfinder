import { INTERVIEW_PREP } from "@/lib/methodology";

export function buildSTARPrompt(
  rawStory: { situation: string; task: string; action: string; result: string; learnings?: string },
  category: string
): string {
  const { star, storyCategories } = INTERVIEW_PREP;
  const matchedCategory = storyCategories.find(c => c.id === category || c.name === category);
  const categoryPrompt = matchedCategory?.prompt || "Improve this story.";

  return `You are PathFinder's AI career mentor, STARL story builder.

PHILOSOPHY: ${INTERVIEW_PREP.philosophy}

STARL STRUCTURE (Situation, Task, Action, Result, Learnings):
- Situation: ${star.situation.rule} (Common mistake: ${star.situation.common_mistake})
- Task: ${star.task.rule} (Common mistake: ${star.task.common_mistake})
- Action: ${star.action.rule} (Common mistake: ${star.action.common_mistake})
- Result: ${star.result.rule} (Common mistake: ${star.result.common_mistake})
- Learnings (optional beat): ${star.learnings.rule} (Common mistake: ${star.learnings.common_mistake})

CATEGORY: ${matchedCategory?.name || category} — ${categoryPrompt}

PRACTICE TIMINGS:
- Short (${INTERVIEW_PREP.practiceTimings.short.duration}): ${INTERVIEW_PREP.practiceTimings.short.use}
- Medium (${INTERVIEW_PREP.practiceTimings.medium.duration}): ${INTERVIEW_PREP.practiceTimings.medium.use}

Raw story:
S: ${rawStory.situation}
T: ${rawStory.task}
A: ${rawStory.action}
R: ${rawStory.result}
L: ${rawStory.learnings?.trim() || "(not given, so leave learnings empty rather than inventing any)"}

Evaluate input quality first:
- Too vague → prompt for specifics
- Too long → help tighten it to an answer that fits 3-5 minutes spoken
- Missing result → ask for the outcome, with a number where they can give one. Never invent a number
- Strong input → structure cleanly

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "PathFinder Interview Prep - STARL (structure from TechTalk Masterclass Day 3)",
  "feedback": [{ "issue": string, "severity": string, "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": boolean,
  "data": {
    "situation": string,
    "task": string,
    "action": string,
    "result": string,
    "learnings": string,
    "mappedQuestions": string[],
    "estimatedDuration": string,
    "tips": string[]
  }
}`;
}

export function buildInterviewQuestionsPrompt(
  cvData: string,
  targetRole: string,
  difficulty: "standard" | "harder" = "standard",
): string {
  const { projectDeepDiveTopics } = INTERVIEW_PREP;
  const topics = projectDeepDiveTopics
    .map((t) => `- ${t.topic}: ${t.prompt}`)
    .join("\n");

  return `You are PathFinder's AI career mentor, interview question generator.

PHILOSOPHY: ${INTERVIEW_PREP.philosophy}

TARGET ROLE: ${targetRole}

PROJECT DEEP-DIVE TOPICS:
${topics}

CV DATA:
---
${cvData}
---

Generate questions from the student's ACTUAL CV content (not generic):
- For each project: deep-dive questions referencing their tech stack and architecture
- For each experience: behavioural questions drawing on what they actually did
- Include "Tell me about yourself", "Why this company?", "Walk me through your project"
- Role-specific technical questions
${difficulty === "harder" ? `
DIFFICULTY: HARDER. The student has seen a first set and wants a tougher round. Skip warm-up questions
("Tell me about yourself", "Why this company?"). Ask the follow-ups a sharp interviewer asks second:
trade-offs and failure modes in their projects, scaling and edge cases, "what would you do differently",
and behavioural questions that probe conflict, ambiguity and mistakes rather than successes.
` : ""}
If the CV is weak (few projects):
"Your CV doesn't have strong project content yet. Before preparing for project deep-dives, consider building a substantial project first."

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "PathFinder Interview Prep",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "questions": [{
      "type": "Behavioral" | "Technical" | "Situational" | "CV-Specific" | "Project Deep-Dive",
      "question": string,
      "answerTemplate": string,
      "relatedCVItem": string,
      "tips": string[]
    }],
    "cvStrength": "weak" | "moderate" | "strong"
  }
}`;
}

export function buildCompanyBriefingPrompt(companyName: string, roleName: string, studentProfile: string): string {
  return `You are PathFinder's AI career mentor — Company Research Briefing.

Generate a research briefing for ${companyName} for the ${roleName} role.

Student profile: ${studentProfile}

Include:
1. What the company does (1-2 sentences)
2. Known tech stack (flag uncertainty: "I'm not confident about their exact tech stack — verify on their engineering blog or careers page.")
3. What they value (from public knowledge)
4. 3 talking points for "Why this company?" connected to the student's actual interests and skills (not generic flattery)
5. 3 intelligent questions to ask the interviewer

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "PathFinder Interview Prep - Company Research",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "companyOverview": string,
    "techStack": string[],
    "techStackConfidence": "high" | "medium" | "low",
    "values": string[],
    "whyThisCompany": string[],
    "questionsToAsk": string[],
    "uncertainties": string[]
  }
}`;
}

export function buildPostInterviewPrompt(
  interviewType: string,
  questionsAsked: string,
  selfRatings: Record<string, number>,
  wentWell: string,
  wouldChange: string,
  previousInterviews: string,
  company = ""
): string {
  return `You are PathFinder's AI career mentor — Post-Interview Analysis.

INTERVIEW DETAILS (this interview only):
Company: ${company || "not given — write [Company] in the email rather than guessing a name"}
Type: ${interviewType}
Questions asked: ${questionsAsked}
Student's self-ratings for this interview (1-5): ${Object.keys(selfRatings).length ? JSON.stringify(selfRatings) : "not given"}
What went well / the student's notes: ${wentWell}
What would do differently: ${wouldChange}

PREVIOUS INTERVIEWS:
${previousInterviews || "No previous interviews logged"}

Generate:
1. Analysis connecting questions to preparation gaps
2. Pattern detection across interviews (if previous data exists)
3. Updated preparation recommendations
4. Thank-you/follow-up email referencing specific conversation details

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "PathFinder Interview Prep",
  "feedback": [{ "issue": string, "severity": string, "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "analysis": string,
    "patternDetection": string[],
    "prepRecommendations": string[],
    "followUpEmail": string
  }
}`;
}
