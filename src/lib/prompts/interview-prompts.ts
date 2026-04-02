import { INTERVIEW_PREP } from "@/lib/methodology";

export function buildSTARPrompt(
  rawStory: { situation: string; task: string; action: string; result: string },
  category: string
): string {
  const { star, storyCategories } = INTERVIEW_PREP;
  const matchedCategory = storyCategories.find(c => c.id === category || c.name === category);
  const categoryPrompt = matchedCategory?.prompt || "Improve this story.";

  return `You are PathFinder's AI career mentor — TechTalk Interview Prep STAR builder.

PHILOSOPHY: ${INTERVIEW_PREP.philosophy}

STAR STRUCTURE:
- Situation: ${star.situation.rule} (Common mistake: ${star.situation.common_mistake})
- Task: ${star.task.rule} (Common mistake: ${star.task.common_mistake})
- Action: ${star.action.rule} (Common mistake: ${star.action.common_mistake})
- Result: ${star.result.rule} (Common mistake: ${star.result.common_mistake})

CATEGORY: ${matchedCategory?.name || category} — ${categoryPrompt}

PRACTICE TIMINGS:
- Short (${INTERVIEW_PREP.practiceTimings.short.duration}): ${INTERVIEW_PREP.practiceTimings.short.use}
- Medium (${INTERVIEW_PREP.practiceTimings.medium.duration}): ${INTERVIEW_PREP.practiceTimings.medium.use}
- Extended (${INTERVIEW_PREP.practiceTimings.extended.duration}): ${INTERVIEW_PREP.practiceTimings.extended.use}

Raw story:
S: ${rawStory.situation}
T: ${rawStory.task}
A: ${rawStory.action}
R: ${rawStory.result}

Evaluate input quality first:
- Too vague → prompt for specifics
- Too long → help tighten to 60-90 seconds
- Missing result → ask for quantified outcome
- Strong input → structure cleanly

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Interview Prep - STAR Method",
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
    "mappedQuestions": string[],
    "estimatedDuration": string,
    "tips": string[]
  }
}`;
}

export function buildInterviewQuestionsPrompt(cvData: string, targetRole: string): string {
  const { projectDeepDiveTopics } = INTERVIEW_PREP;
  const topics = projectDeepDiveTopics
    .map((t) => `- ${t.topic}: ${t.prompt}`)
    .join("\n");

  return `You are PathFinder's AI career mentor — TechTalk Interview Question Generator.

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

If the CV is weak (few projects):
"Your CV doesn't have strong project content yet. Before preparing for project deep-dives, consider building a substantial project first."

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Interview Prep",
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
  "methodologyReference": "TechTalk Interview Prep - Company Research",
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
  previousInterviews: string
): string {
  return `You are PathFinder's AI career mentor — Post-Interview Analysis.

INTERVIEW DETAILS:
Type: ${interviewType}
Questions asked: ${questionsAsked}
Self-ratings: ${JSON.stringify(selfRatings)}
What went well: ${wentWell}
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
  "methodologyReference": "TechTalk Interview Prep",
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
