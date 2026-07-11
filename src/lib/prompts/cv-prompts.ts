import { CV_BLUEPRINT } from "@/lib/methodology";

export function buildCVAnalysisPrompt(): string {
  const { sectionOrder, formattingRules, checks, bulletFormula, fPattern, standoutProjectQualities, vagueTerms } = CV_BLUEPRINT;
  return `You are an expert CV reviewer following the TechTalk 2026 CV Blueprint methodology.

SECTION ORDER (optimal):
${sectionOrder.map((s) => `${s.position}. ${s.name}: ${s.rule} — WHY: ${s.rationale}`).join("\n")}

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

7 QUALITIES OF STANDOUT PROJECTS:
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
  "hasBlockers": boolean,
  "blockerWarning": string | null
}`;
}
