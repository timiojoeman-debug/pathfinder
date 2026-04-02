import { NETWORKING_STRATEGY, COFFEE_CHAT } from "@/lib/methodology";

type OutreachParams = {
  studentProfile: string;
  contactProfile: string;
  contactType: "recruiter" | "hiringManager" | "peer";
  roleName: string;
};

export function buildOutreachPrompt(params: OutreachParams): string {
  const { hiringPyramid, stats, targetGroups, outreachVariants, dosAndDonts } = NETWORKING_STRATEGY;
  const groupKey = params.contactType === "recruiter" ? "recruiters" : params.contactType === "hiringManager" ? "hiringManagers" : "peers";
  const group = targetGroups[groupKey];
  const searchTitles = "searchTitles" in group ? (group as { searchTitles: readonly string[] }).searchTitles.join(", ") : "N/A";
  return `You are PathFinder's AI career mentor writing networking messages following the TechTalk methodology.

HIRING PYRAMID:
${hiringPyramid.map(h => `${h.tier}. ${h.source}: ${h.description}`).join("\n")}

STATS: ${stats.hiddenJobMarket}. ${stats.referralAdvantage}.

TARGET GROUP (${params.contactType}):
- Search titles: ${searchTitles}
- Capability: ${group.capability}
- Approach: ${group.approach}
- Tone: ${group.tone}

OUTREACH VARIANTS (choose based on actual context — NEVER fabricate connections):
1. ${outreachVariants.sharedConnection.name}: ${outreachVariants.sharedConnection.when} → ${outreachVariants.sharedConnection.leadWith}
2. ${outreachVariants.contentHook.name}: ${outreachVariants.contentHook.when} → ${outreachVariants.contentHook.leadWith}
3. ${outreachVariants.curiosityHumility.name}: ${outreachVariants.curiosityHumility.when} → ${outreachVariants.curiosityHumility.leadWith}

DO'S: ${dosAndDonts.dos.join("; ")}
DON'TS: ${dosAndDonts.donts.join("; ")}

Student profile: ${params.studentProfile}
Contact profile: ${params.contactProfile}
Role: ${params.roleName}

CRITICAL RULES:
- First assess what shared attributes ACTUALLY exist. Never fabricate.
- Keep the message under 150 words.
- Include a reminder: "${dosAndDonts.footer}"

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Networking Strategy",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "sharedAttributes": string[],
    "selectedVariant": string,
    "variantReason": string,
    "message": string,
    "suggestedChannel": string,
    "callToAction": string,
    "questions": string[],
    "topics": string[],
    "followUp": string,
    "editReminder": "${dosAndDonts.footer}"
  }
}`;
}

export function buildCoffeeChatPrepPrompt(
  contactName: string,
  contactRole: string,
  contactCompany: string,
  studentProfile: string,
  coffeeChatsDone: number
): string {
  const { framework, questionBank, experienceLevelCalibration } = COFFEE_CHAT;
  const categories = Object.entries(questionBank)
    .map(([cat, qs]) => `${cat}: ${qs.join("; ")}`)
    .join("\n");

  const level = coffeeChatsDone === 0 ? 'firstTimer' : coffeeChatsDone < 3 ? 'beginner' : 'experienced';
  const calibration = experienceLevelCalibration[level];

  return `You are PathFinder's AI career mentor preparing a coffee chat using the TechTalk Coffee Chat Mastery framework.

EXPERIENCE LEVEL: ${level} (${coffeeChatsDone} chats done) — ${calibration.approach}

4-PART FRAMEWORK:
1. Preparation: ${framework.preparation.description}
   Steps: ${framework.preparation.steps.join("; ")}
2. Opening script: "${framework.opening.script}"
   Tips: ${framework.opening.tips.join("; ")}
3. Core: ${framework.coreConversation.description}
   Actions: ${framework.coreConversation.actions.join("; ")}
4. Closing: ${framework.closing.description}
   Direct referral ask: "${framework.closing.referralAsk.direct.script}" (${framework.closing.referralAsk.direct.when})
   Indirect referral ask: "${framework.closing.referralAsk.indirect.script}" (${framework.closing.referralAsk.indirect.when})
   Guidance: ${framework.closing.referralAsk.guidance}

QUESTION BANK BY CATEGORY:
${categories}

Contact: ${contactName}, ${contactRole} at ${contactCompany}
Student: ${studentProfile}

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Coffee Chat Mastery",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "researchBrief": string,
    "sharedAttributes": string[],
    "openingScript": string,
    "conversationQuestions": [{ "category": string, "question": string }],
    "closingStrategy": { "approach": "direct" | "indirect", "script": string, "reason": string },
    "followUpReminder": string
  }
}`;
}

export function buildFollowUpPrompt(
  contactName: string,
  chatNotes: string,
  cadenceStep: number
): string {
  const step = COFFEE_CHAT.followUpCadence[cadenceStep - 1];
  if (!step) throw new Error("Invalid cadence step");

  const refuseIfEmpty = cadenceStep === 1 && !chatNotes.trim();
  if (refuseIfEmpty) {
    throw new Error("I need to know what you discussed to write a genuine follow-up. Please add your chat notes first.");
  }

  return `TechTalk Coffee Chat Mastery — Follow-up Step ${cadenceStep}: ${step.purpose}
Timing: ${step.timing}
Template: ${step.template}
Rule: ${step.rule}

Contact: ${contactName}
Chat notes: ${chatNotes}

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Coffee Chat Mastery - Follow-Up Cadence",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "message": string,
    "timing": string,
    "purpose": string,
    "nextStepReminder": string
  }
}`;
}

export function buildStartupOutreachPrompt(
  studentProfile: string,
  companyName: string,
  companyDetail: string
): string {
  const { startupOutreach, dosAndDonts } = NETWORKING_STRATEGY;

  if (!companyDetail.trim() || companyDetail.length < 20) {
    throw new Error(
      "The one specific detail about the company is non-negotiable. A generic email to 50 startups gets zero replies. Spend 10 minutes on their website, blog, or GitHub."
    );
  }

  return `TechTalk Startup Outreach Strategy.

TARGET: ${startupOutreach.target}
COMPANY SIZE: ${startupOutreach.companySize}
FRAME: ${startupOutreach.frame}
OFFERS: ${startupOutreach.offers.join(", ")}
ASK: ${startupOutreach.ask}
CRITICAL RULE: ${startupOutreach.criticalRule}

Student: ${studentProfile}
Company: ${companyName}
Company-specific detail: ${companyDetail}

${dosAndDonts.footer}

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Networking Strategy - Startup Outreach",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "message": string,
    "targetRole": string,
    "companySpecificDetail": string,
    "callToAction": string,
    "editReminder": "${dosAndDonts.footer}"
  }
}`;
}

export function buildReferralPackagePrompt(
  studentProfile: string,
  contactName: string,
  roleName: string,
  chatNotes: string,
  cvStrengths: string[]
): string {
  return `TechTalk Referral Package Generator.

Generate a forwardable referral package — a concise message (UNDER 100 words) written from ${contactName}'s perspective that they can copy-paste to their hiring manager or submit through their referral system.

Student profile: ${studentProfile}
Contact: ${contactName}
Role: ${roleName}
CV strengths: ${cvStrengths.join(", ")}
Chat notes: ${chatNotes || "No notes available"}

The package must:
- Be written from the CONTACT'S perspective (first person: "I recently spoke with...")
- Reference specific student strengths from the CV
- If chat notes exist, reference something the contact found impressive
- Include the role title
- Be easy to act on (copy-paste ready)
- Under 100 words

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "TechTalk Networking Strategy - Referral Package",
  "feedback": [],
  "strengths": string[],
  "crossPhaseInsights": string[],
  "nextSteps": string[],
  "nextQuestion": string,
  "shouldRepeatAnalysis": false,
  "data": {
    "referralMessage": string,
    "wordCount": number,
    "instructions": string
  }
}`;
}
