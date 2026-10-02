import { NETWORKING_STRATEGY, COFFEE_CHAT } from "@/lib/methodology";
import { CONTACT_TYPE_LABEL, canReferYou, type ContactType } from "@/lib/contact-type";

type OutreachParams = {
  studentProfile: string;
  contactProfile: string;
  contactType: "recruiter" | "hiringManager" | "peer";
  roleName: string;
};

export function buildOutreachPrompt(params: OutreachParams): string {
  const { hiringPyramid, stats, targetGroups, outreachVariants, dosAndDonts, whoToAsk, connectionRequests, personalisationSignals, transactionalVsRelationship } = NETWORKING_STRATEGY;
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

WHO TO ASK FOR WHAT (nobody is ever asked for a job):
${whoToAsk.map(w => `- ${w.who}: ${w.style}. Referral: ${w.referral ? "yes, once they know you" : "no"}. ${w.ask}`).join("\n")}
${askRule(params.contactType)}

CONNECTION NOTE ANATOMY (a LinkedIn note is at most ${connectionRequests.charLimit} characters):
${params.contactType === "peer" ? `Peer note: ${connectionRequests.peer.parts.join("; ")}. ${connectionRequests.peer.note}` : `Recruiter note: ${connectionRequests.recruiter.parts.join("; ")}. ${connectionRequests.recruiter.note}`}

PERSONALISATION SIGNALS (use only ones the contact profile actually shows, never invent): ${personalisationSignals.map(x => `${x.signal} (${x.look})`).join("; ")}

RELATIONSHIP, NOT TRANSACTION: ${transactionalVsRelationship.map(r => `${r.row}: not ${r.transactional}, but ${r.relationship}`).join("; ")}

DO'S: ${dosAndDonts.dos.join("; ")}
DON'TS: ${dosAndDonts.donts.join("; ")}

Student profile: ${params.studentProfile}
Contact profile: ${params.contactProfile}
Role: ${params.roleName}

CRITICAL RULES:
- First assess what shared attributes ACTUALLY exist. Never fabricate.
- Never ask the contact for a job. ${params.contactType === "peer" ? "Do not ask for a referral in the first message either: ask to learn from them." : "Never ask this contact for a referral."}
- If the message is a LinkedIn connection note, keep it under 300 characters. For a first message or email, keep it short: roughly 5-6 sentences.
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

/** The hard rule for the contact type, in the outreach prompt. */
export function askRule(t: "recruiter" | "hiringManager" | "peer"): string {
  return t === "peer"
    ? "THIS CONTACT: a peer. They can refer the student, but only once they know them. Ask for their story and advice, not a referral and not a job."
    : `THIS CONTACT: a ${t === "recruiter" ? "recruiter" : "hiring manager"}. They cannot refer the student. NEVER ask them for a referral or a job. Show fit for the specific role and make one clear, fit-driven ask${t === "recruiter" ? " (for example, insight on the role or process)" : ""}.`;
}

/* Who the contact is decides the close. Peers can refer; recruiters and hiring
   managers cannot, so asking them for a referral is the wrong ask. */
function contactFraming(t: ContactType): string {
  return canReferYou(t)
    ? `CONTACT TYPE: Peer on the team. TRUST-DRIVEN: they are the only kind of contact who can refer the student. Keep the conversation about them and their work; build trust first. Never open with an ask.`
    : `CONTACT TYPE: ${CONTACT_TYPE_LABEL[t]}. FIT-DRIVEN: they cannot refer the student, so never suggest asking them for a referral. Show fit instead: name the specific role, the student's matching proof, and one clear ask.`;
}

const NO_REFERRAL_CLOSE = `Close with one clear, fit-driven ask (for example, whether the student's background fits the role, or what the team looks for at this level). closingStrategy.script is that ask, never a referral request.`;

export function buildCoffeeChatPrepPrompt(
  contactName: string,
  contactRole: string,
  contactCompany: string,
  studentProfile: string,
  coffeeChatsDone: number,
  contactType: ContactType = "peer"
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
3. Their story: ${framework.coreConversation.description}
   Actions: ${framework.coreConversation.actions.join("; ")}
4. Positioning (${framework.positioning.duration}): ${framework.positioning.description}
   Actions: ${framework.positioning.actions.join("; ")}
5. Closing: ${canReferYou(contactType) ? `${framework.closing.description}
   Direct referral ask: "${framework.closing.referralAsk.direct.script}" (${framework.closing.referralAsk.direct.when})
   Indirect referral ask: "${framework.closing.referralAsk.indirect.script}" (${framework.closing.referralAsk.indirect.when})
   Guidance: ${framework.closing.referralAsk.guidance}` : NO_REFERRAL_CLOSE}

${contactFraming(contactType)}

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
  cadenceStep: number,
  contactType: ContactType = "peer"
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

${contactFraming(contactType)}

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

/** The guard every application follow-up prompt carries. Tests assert it is present. */
export const NO_PRIOR_CONVERSATION =
  "There has been NO prior conversation with this person. Never thank them for a chat, call or meeting, never say \"great to speak with you\", \"as we discussed\" or \"reconnect\", and never imply you have met.";

/**
 * A follow-up on a submitted application that has gone quiet. Separate from the
 * coffee-chat cadence, whose templates assume a conversation already happened.
 */
export function buildApplicationFollowUpPrompt(p: {
  company: string;
  role: string;
  contactName?: string;
  appliedOn?: string;
  notes?: string;
}): string {
  const greeting = p.contactName?.trim() ? `Hi ${p.contactName.trim()},` : "Hello,";
  return `Write a short, polite follow-up on a job application that has had no reply.

${NO_PRIOR_CONVERSATION}

FACTS (use only these; do not invent anything else):
- Role: ${p.role}
- Company: ${p.company}
- Applied: ${p.appliedOn?.trim() || "date not given, so do not state one"}
- Student's own notes: ${p.notes?.trim() || "none"}

RULES:
- Open with exactly: "${greeting}"
- 60 to 110 words. Restate interest in the ${p.role} role at ${p.company}, mention the application was submitted, ask politely whether there is any update on the timeline.
- Mention something from the student's notes only if the notes say it; never invent a project, a referral or a name.
- Output finished text: no square brackets, no placeholders like [Name] or [Company], nothing left for the student to fill in.
- UK spelling. No em dashes. Plain and warm, not grovelling.

Respond ONLY with valid JSON:
{
  "inputQuality": string,
  "inputQualityExplanation": string,
  "methodologyReference": "Application follow-up",
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
