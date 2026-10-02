import { CV_BLUEPRINT } from "@/lib/methodology";
import { JD_DECODER, PORTFOLIO_PAGE_ORDER } from "@/lib/methodology/recruiter-signals";

export function buildCVAnalysisPrompt(): string {
  const { sectionOrder, studentSectionOrder, formattingRules, checks, bulletFormula, fPattern, standoutProjectQualities, vagueTerms } = CV_BLUEPRINT;
  return `You are an expert CV reviewer following the TechTalk 2026 CV Blueprint methodology.

SECTION ORDER FOR STUDENTS AND GRADUATES (use this when relevant experience is thin, which is the usual case for internship applicants):
${studentSectionOrder.map((s) => `${s.position}. ${s.name}: ${s.rule} — WHY: ${s.rationale}`).join("\n")}

SECTION ORDER FOR CANDIDATES WITH SUBSTANTIAL RELEVANT EXPERIENCE:
${sectionOrder.map((s) => `${s.position}. ${s.name}: ${s.rule} — WHY: ${s.rationale}`).join("\n")}

Judge sectionOrderScore against the order that fits this candidate's experience, not against the experience-first order by default.

FORMATTING RULES:
${formattingRules.join("\n")}

CHECKS:
${checks.map(c => `- ${c.check}: ${c.why}`).join("\n")}

BULLET FORMULA: ${bulletFormula.structure}
Weak examples: ${bulletFormula.weakExamples.map(e => `"${e.text}" (${e.problem})`).join("; ")}
Strong examples: ${bulletFormula.strongExamples.map(e => `"${e.text}" (${e.why})`).join("; ")}

VAGUE TERMS TO FLAG:
${vagueTerms.flagWords.map(f => `"${f.term}" → ${f.rewrite}`).join("\n")}

F-PATTERN (recruiter ${fPattern.totalTime} scan):
${fPattern.zones.map(z => `${z.zone} (${z.scanTime}): ${z.content}`).join("\n")}

QUALITIES OF A STANDOUT PROJECT:
${standoutProjectQualities.map((q, i) => `${i + 1}. ${q.quality}: ${q.description}`).join("\n")}

IMPORTANT — INPUT QUALITY EVALUATION:
Before analysing, classify the CV as: minimal_effort, rough_draft, decent_attempt, strong_input, or excellent_input.
- minimal_effort: Give foundational advice with 1 priority fix
- rough_draft: Identify top 3 issues
- decent_attempt: Full analysis
- strong_input: Optimisation suggestions
- excellent_input: Confirm strengths and pivot to next phase

Every suggestion must explain WHY using the CV Blueprint methodology by name.
Use UK spelling in all suggestions (organisation, colour, etc.).

Respond ONLY with valid JSON matching the MentorResponse schema:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk CV Blueprint",
  "score": number,
  "feedback": [{ "issue": string, "severity": "critical"|"important"|"suggestion", "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string, "example": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": boolean,
  "data": {
    "education": [{ "institution": string, "degree": string, "period": string }],
    "experience": [{ "role": string, "company": string, "period": string, "bullets": string[] }],
    "projects": [{ "name": string, "description": string, "tech": string[] }],
    "skills": string[],
    "atsScore": number,
    "sectionOrderScore": number,
    "fPatternScore": number
  }
}`;
}

export function buildPortfolioReviewPrompt(targetRole: string, techStack: string[]): string {
  const { standoutProjectQualities } = CV_BLUEPRINT;
  return `You are PathFinder's AI career mentor reviewing a student's PROJECT PORTFOLIO against the TechTalk standout-project qualities.

QUALITIES OF A STANDOUT PROJECT:
${standoutProjectQualities.map((q, i) => `${i + 1}. ${q.quality}: ${q.description}`).join("\n")}

TARGET ROLE: ${targetRole || "not specified (judge the work against the role it points to; do not assume software engineering)"}
TARGET STACK / TOOLS: ${techStack.join(", ") || "not specified"}

The role may be non-engineering (marketing, data, design, product, sales, operations). Judge such work on the same evidence of a problem, decisions and a result. Do not penalise a project for lacking a repo, tests or a deployed URL unless the role is a software one.

You are given text the student pasted about their portfolio — project descriptions, GitHub READMEs, or copy from a portfolio site. Review ONLY what they pasted. NEVER invent a project, a metric, a deployment, or a link they did not mention — a fabricated project is worse than an honest gap.

For each project you can identify in the pasted text:
- name it as written
- give a one-line verdict on how it reads to a recruiter for the target role
- list which standout qualities it is MISSING (e.g. deployed URL, tests, README depth, documented decisions, version control, demo, real problem, modern stack)

ANSWER-FIRST CASE-STUDY CHECK (TechTalk portfolio deck). A hiring manager wants to know whether the person can identify a problem, make decisions and deliver something that worked. For each project, judge only from the pasted text:
- answerFirst: does it open with a 2-3 line summary of the answer before the detail?
- starl: does it show the student's OWN role (not "we" or the team's), the actions and decisions, a result, and what they learned? List any of situation, task, action, result, learnings that are missing.
- hasNumber: does the result include a number? If it does not, say so; never supply one.

PAGE-STRUCTURE CHECK. The recommended order of a portfolio page is: ${PORTFOLIO_PAGE_ORDER.join("; ")}. From the pasted text, say which of hero, body of work, about and contact are present, absent, or cannot be judged because only project text was pasted. Mark "unknown" rather than guess.

GENERIC ABOUT CHECK. If an About section was pasted, flag generic AI-sounding copy (for example "passionate problem solver who loves collaboration"). Quote only phrases that appear in the text. Suggest picking 2-3 things that are genuinely true about the student. If no About text was pasted, return aboutGeneric as false with an empty aboutPhrases list.

Then across the whole portfolio give an honest overall impression, the strengths actually present, the qualities most commonly missing, and the top 3 fixes with the highest hireability impact.

If the pasted text contains no identifiable project, say so and ask for project descriptions rather than inventing feedback.

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk CV Blueprint - Portfolio Review",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "overallImpression": string,
    "strengths": string[],
    "gaps": string[],
    "projectFeedback": [{
      "name": string, "verdict": string, "missing": string[],
      "caseStudy": { "answerFirst": boolean, "ownRole": boolean, "hasNumber": boolean, "starlMissing": string[] }
    }],
    "pageStructure": { "hero": "present" | "absent" | "unknown", "bodyOfWork": "present" | "absent" | "unknown", "about": "present" | "absent" | "unknown", "contact": "present" | "absent" | "unknown" },
    "aboutGeneric": boolean,
    "aboutPhrases": string[],
    "topFixes": string[]
  }
}`;
}

export function buildATSAuditPrompt(jobDescription: string): string {
  const { atsChecklist, screeningStages, tailoringProcess } = CV_BLUEPRINT;
  return `You are an ATS audit expert following the TechTalk CV Blueprint.

SCREENING STAGES:
${screeningStages.map((s) => `- ${s.stage}: ${s.timing} (${s.detail})`).join("\n")}

ATS CHECKLIST:
${atsChecklist.map((c) => `- [${c.category}] ${c.item}`).join("\n")}

QUICK TAILORING (${tailoringProcess.name} — ${tailoringProcess.targetMinutes}-minute target):
${tailoringProcess.steps.map((s) => `${s.step}. ${s.action} (~${s.timeMinutes} min)`).join("\n")}

JOB DESCRIPTION TO MATCH:
---
${jobDescription.slice(0, 4000)}
---

Extract 3-5 critical keywords. For each keyword, check if it exists in the CV and where.
Tag each as critical, important, or nice-to-have.

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk CV Blueprint ATS Audit",
  "score": number,
  "feedback": [{ "issue": string, "severity": string, "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": boolean,
  "data": {
    "criticalKeywords": [{ "keyword": string, "foundInCV": boolean, "cvSection": string, "suggestedPlacement": string, "priority": "critical"|"important"|"nice-to-have" }],
    "atsChecklist": [{ "item": string, "passed": boolean, "fix": string }],
    "overallATSScore": number,
    "tailoringSuggestions": string[],
    "readyToApply": boolean
  }
}`;
}

export function buildMatchScorePrompt(jobDescription: string): string {
  return `You assess CV-to-job compatibility following the TechTalk methodology.

Score ranges and guidance:
- Below 40%: Honestly state significant stretch with specific gap explanation
- 40-60%: Show improvement strategy with keyword and tailoring suggestions
- 60-80%: Confirm competitiveness, focus on 2-3 optimisations
- Above 80%: Confirm strong match, shift focus to networking strategy

JOB DESCRIPTION:
---
${jobDescription.slice(0, 4000)}
---

ADDITIONALLY — NON-NEGOTIABLE REQUIREMENTS:
Scan the job description for hard requirements that cannot be met through CV tailoring or skill development in the short term. These include:
- Minimum years of professional experience (not internships or projects)
- Mandatory location if the role is not remote
- Work authorisation or visa sponsorship restrictions
- Required certifications the candidate does not hold
- Security clearance requirements
- Degree level requirements above what the candidate has

For each non-negotiable found, return:
{
  requirement: string (what the job requires),
  category: "experience" | "location" | "visa" | "certification" | "clearance" | "degree",
  studentMeets: boolean,
  explanation: string (why this is or isn't a blocker)
}

If the student cannot meet one or more non-negotiable requirements, include a clear warning.

ADDITIONALLY — MUST-HAVE DECODER (a different list from the non-negotiables above):
Sort the advert's skills and requirements into three tiers:
${JD_DECODER.tiers.map((t) => `- ${t.label}: ${t.detail}`).join("\n")}
Signals that a skill is a must-have: it follows one of ${JD_DECODER.mustHaveWords.map((w) => `"${w}"`).join(", ")}; ${JD_DECODER.positionSignals.join(" ")} ${JD_DECODER.repeatRule}
Signals that a skill is a nice-to-have: it follows one of ${JD_DECODER.niceToHaveWords.map((w) => `"${w}"`).join(", ")}.
Return only the MUST-HAVES, at most 8, as "mustHaves": [{ "skill": string, "met": boolean }], where "met" is true only if the CV shows evidence of that skill. Do not credit a skill the CV does not mention. If the advert names no clear must-haves, return an empty array rather than guessing.
Do not compute a percentage; the app derives "x of y" from your list.

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk CV Blueprint Match Assessment",
  "score": number,
  "feedback": [{ "issue": string, "severity": string, "methodologyBasis": string, "explanation": string, "currentState": string, "suggestedFix": string }],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": boolean,
  "data": {
    "matchScore": number,
    "matchedSkills": string[],
    "missingSkills": string[],
    "assessmentTier": string,
    "guidance": string
  },
  "nonNegotiables": [{ "requirement": string, "category": "experience" | "location" | "visa" | "certification" | "clearance" | "degree", "studentMeets": boolean, "explanation": string }],
  "mustHaves": [{ "skill": string, "met": boolean }],
  "hasBlockers": boolean,
  "blockerWarning": string | null
}`;
}
