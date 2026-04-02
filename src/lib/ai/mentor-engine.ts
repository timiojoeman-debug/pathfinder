import { createServerClient } from '@/lib/supabase/client';
import type {
  UserContext, MentorResponse, InputQuality, MentorFeedbackItem,
  UserPhase, ApplicationStatus, CVParsedData, CVAnalysisHistoryEntry
} from '@/types/database';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Feature configurations
const FEATURE_CONFIG: Record<string, { temperature: number; methodologyType: 'static' | 'rag' }> = {
  'cv-analysis': { temperature: 0.3, methodologyType: 'static' },
  'ats-audit': { temperature: 0.3, methodologyType: 'static' },
  'match-score': { temperature: 0.3, methodologyType: 'static' },
  'direction-builder': { temperature: 0.3, methodologyType: 'rag' },
  'direction-explore': { temperature: 0.7, methodologyType: 'rag' },
  'direction-score': { temperature: 0.3, methodologyType: 'static' },
  'project-builder': { temperature: 0.7, methodologyType: 'static' },
  'linkedin-check': { temperature: 0.3, methodologyType: 'static' },
  'cover-letter': { temperature: 0.7, methodologyType: 'rag' },
  'outreach-recruiter': { temperature: 0.7, methodologyType: 'rag' },
  'outreach-hiring-manager': { temperature: 0.7, methodologyType: 'rag' },
  'outreach-peer': { temperature: 0.7, methodologyType: 'rag' },
  'startup-outreach': { temperature: 0.7, methodologyType: 'rag' },
  'coffee-chat-prep': { temperature: 0.7, methodologyType: 'rag' },
  'follow-up': { temperature: 0.7, methodologyType: 'rag' },
  'referral-package': { temperature: 0.7, methodologyType: 'rag' },
  'star-builder': { temperature: 0.3, methodologyType: 'static' },
  'interview-questions': { temperature: 0.7, methodologyType: 'rag' },
  'company-briefing': { temperature: 0.7, methodologyType: 'rag' },
  'post-interview': { temperature: 0.7, methodologyType: 'rag' },
  'rejection-diagnosis': { temperature: 0.3, methodologyType: 'static' },
};

// Step 1: Build UserContext from database
export async function buildUserContext(userId: string): Promise<UserContext> {
  const db = createServerClient();

  const [
    profileResult,
    cvResult,
    appsResult,
    contactsResult,
    chatsResult,
    storiesResult,
    leetcodeResult,
  ] = await Promise.all([
    db.from('profiles').select('*').eq('user_id', userId).single(),
    db.from('cvs').select('*').eq('user_id', userId).eq('is_master', true).single(),
    db.from('applications').select('*').eq('user_id', userId),
    db.from('networking_contacts').select('*').eq('user_id', userId),
    db.from('coffee_chat_notes').select('*').eq('user_id', userId),
    db.from('interview_stories').select('*').eq('user_id', userId),
    db.from('leetcode_progress').select('*').eq('user_id', userId),
  ]);

  const profile = profileResult.data;
  const cv = cvResult.data;
  const apps = appsResult.data || [];
  const contacts = contactsResult.data || [];
  const chats = chatsResult.data || [];
  const stories = storiesResult.data || [];
  const leetcode = leetcodeResult.data || [];

  const prefs = (profile?.career_preferences || {}) as Record<string, unknown>;
  const parsed = cv?.parsed_data as CVParsedData | null;

  // Calculate this week's apps
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekApps = apps.filter(a =>
    a.applied_date && new Date(a.applied_date) >= weekStart
  ).length;

  // Status counts
  const statuses = {} as Record<ApplicationStatus, number>;
  const allStatuses: ApplicationStatus[] = ['researching', 'tailoring', 'applied', 'networking', 'interviewing', 'offer', 'rejected', 'ghosted'];
  for (const s of allStatuses) {
    statuses[s] = apps.filter(a => a.status === s).length;
  }

  // Skills analysis
  const detectedSkills = parsed?.skills || [];
  const allProjectTech = (parsed?.projects || []).flatMap(p => p.tech || []);
  const strongest = [...new Set([...detectedSkills, ...allProjectTech])].slice(0, 10);

  return {
    direction: {
      statement: profile?.direction_statement || null,
      score: profile?.direction_score || null,
      role: (prefs.role as string) || '',
      industry: (prefs.industry as string) || '',
      techStack: Array.isArray(prefs.techStack) ? prefs.techStack as string[] : [],
      location: (prefs.location as string) || '',
    },
    cv: {
      parsed: parsed || null,
      score: cv?.analysis_results ? (cv.analysis_results as Record<string, unknown>).overallScore as number || null : null,
      analysisHistory: (profile?.cv_analysis_history || []) as CVAnalysisHistoryEntry[],
    },
    skills: {
      detected: detectedSkills,
      missing: [],
      strongest,
    },
    applications: {
      total: apps.length,
      thisWeek: thisWeekApps,
      statuses,
      companies: [...new Set(apps.map(a => a.company))],
      recentRejectionTimings: apps
        .filter(a => a.status === 'rejected' && a.rejection_timing)
        .slice(0, 5)
        .map(a => a.rejection_timing!),
    },
    networking: {
      contactsCount: contacts.length,
      coffeeChatsDone: chats.length,
      messagesSent: contacts.filter(c => c.message_text).length,
      activeFollowUps: contacts.filter(c => c.follow_up_due && new Date(c.follow_up_due) >= new Date()).length,
    },
    interviewPrep: {
      storiesCount: stories.length,
      storiesCategories: [...new Set(stories.map(s => s.category).filter(Boolean))],
      leetcodeProgress: {
        total: leetcode.length,
        solved: leetcode.filter(l => l.status === 'solved').length,
      },
    },
    phase: (profile?.user_phase || 'new') as UserPhase,
  };
}

// Step 2: Retrieve methodology (RAG or static)
async function retrieveMethodology(feature: string, userInput: string): Promise<string> {
  const config = FEATURE_CONFIG[feature];
  if (!config || config.methodologyType === 'static') {
    return ''; // Static methodology is injected directly in prompts
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return '';

    // Embed user input
    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: userInput.slice(0, 2000),
      }),
    });

    if (!embeddingRes.ok) return '';
    const embeddingData = await embeddingRes.json();
    const embedding = embeddingData.data?.[0]?.embedding;
    if (!embedding) return '';

    // Query methodology chunks
    const db = createServerClient();
    const { data: chunks } = await db.rpc('match_methodology', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (chunks && chunks.length > 0) {
      return chunks.map((c: { title: string; chunk_text: string }) =>
        `[${c.title}]\n${c.chunk_text}`
      ).join('\n\n');
    }
  } catch (e) {
    console.error('RAG retrieval failed:', e);
  }

  return '';
}

// Step 3: Build input quality evaluation instructions
function buildInputQualityInstructions(): string {
  return `STEP 1 — INPUT QUALITY EVALUATION (do this FIRST before any analysis):
Classify the input as one of:
- minimal_effort: Very little detail, generic, no specifics. Response: Give foundational advice with 1 priority fix.
- rough_draft: Some effort but major gaps. Response: Identify top 3 issues.
- decent_attempt: Reasonable effort with room for improvement. Response: Full analysis.
- strong_input: Good quality with minor optimisations needed. Response: Optimisation suggestions.
- excellent_input: High quality, well-crafted. Response: Confirm strengths and pivot to next phase.

Your response depth MUST match the input quality tier.`;
}

// Step 4: Build the full prompt
function buildMentorPrompt(params: {
  feature: string;
  featureSystemPrompt: string;
  methodology: string;
  userContext: UserContext;
  previousInteractions?: string;
}): string {
  const { feature, featureSystemPrompt, methodology, userContext, previousInteractions } = params;

  const contextParts = [
    `You are PathFinder's AI career mentor specialising in ${feature.replace(/-/g, ' ')}.`,
    `You follow the TechTalk internship methodology. Every piece of advice must reference the methodology by name.`,
    '',
    featureSystemPrompt,
    '',
    buildInputQualityInstructions(),
    '',
  ];

  // Add methodology
  if (methodology) {
    contextParts.push('RELEVANT METHODOLOGY:', methodology, '');
  }

  // Add user context
  contextParts.push('STUDENT CONTEXT:');
  if (userContext.direction.statement) {
    contextParts.push(`Direction: ${userContext.direction.statement} (score: ${userContext.direction.score})`);
    contextParts.push(`Target: ${userContext.direction.role} in ${userContext.direction.industry}, ${userContext.direction.location}`);
    contextParts.push(`Tech stack: ${userContext.direction.techStack.join(', ')}`);
  } else {
    contextParts.push('Direction: Not yet set');
  }

  if (userContext.cv.parsed) {
    contextParts.push(`CV: ${userContext.skills.detected.length} skills detected, strongest: ${userContext.skills.strongest.slice(0, 5).join(', ')}`);
    contextParts.push(`Projects: ${userContext.cv.parsed.projects.length}, Experience: ${userContext.cv.parsed.experience.length}`);
  }

  contextParts.push(`Applications: ${userContext.applications.total} total (${userContext.applications.thisWeek} this week)`);
  contextParts.push(`Networking: ${userContext.networking.contactsCount} contacts, ${userContext.networking.coffeeChatsDone} coffee chats`);
  contextParts.push(`Interview prep: ${userContext.interviewPrep.storiesCount} STAR stories, ${userContext.interviewPrep.leetcodeProgress.solved}/${userContext.interviewPrep.leetcodeProgress.total} LeetCode`);
  contextParts.push(`Phase: ${userContext.phase}`);
  contextParts.push('');

  // Previous interactions
  if (previousInteractions) {
    contextParts.push('PREVIOUS INTERACTIONS:', previousInteractions, '');
  }

  // Cross-phase rules
  contextParts.push(`CROSS-PHASE RULES:
- If the student has a direction statement, reference it in your advice.
- If they have applications, connect analysis to outcomes.
- If their CV has been analysed before, note improvements or regressions.
- Always end with a nextQuestion or nextStep — never leave the student at a dead end.
- Use UK spelling throughout.`);

  contextParts.push('');
  contextParts.push(`RESPONSE FORMAT: Respond ONLY with valid JSON matching the MentorResponse schema. Strip all markdown.`);

  return contextParts.join('\n');
}

// Step 5: Call OpenAI
async function callOpenAI(systemPrompt: string, userMessage: string, temperature: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let content = data?.choices?.[0]?.message?.content ?? '';
  if (typeof content !== 'string') content = String(content);

  // Strip markdown code fences
  return content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

// Step 6: Store interaction
async function storeInteraction(
  userId: string,
  feature: string,
  response: MentorResponse,
  inputSummary: string
): Promise<void> {
  try {
    const db = createServerClient();
    await db.from('ai_interactions').insert({
      user_id: userId,
      feature,
      input_quality: response.inputQuality,
      methodology_applied: response.methodologyReference,
      score: response.score ?? null,
      input_summary: inputSummary.slice(0, 500),
      output_summary: (response.feedback?.[0]?.issue || response.strengths?.[0] || '').slice(0, 500),
      feedback_items_count: response.feedback?.length || 0,
    });
  } catch (e) {
    console.error('Failed to store AI interaction:', e);
  }
}

// Get previous interactions for context
async function getPreviousInteractions(userId: string, feature: string): Promise<string> {
  try {
    const db = createServerClient();
    const { data } = await db
      .from('ai_interactions')
      .select('input_quality, score, output_summary, created_at')
      .eq('user_id', userId)
      .eq('feature', feature)
      .order('created_at', { ascending: false })
      .limit(3);

    if (data && data.length > 0) {
      return data.map(d =>
        `[${new Date(d.created_at).toLocaleDateString()}] Quality: ${d.input_quality}, Score: ${d.score ?? 'N/A'}, Summary: ${d.output_summary}`
      ).join('\n');
    }
  } catch {
    // Ignore
  }
  return '';
}

// ═══════════════════════════════════════════════════════════
// MAIN ENTRY POINT — called by every API route
// ═══════════════════════════════════════════════════════════
export async function runMentorEngine(params: {
  userId: string;
  feature: string;
  featurePrompt: string;
  userMessage: string;
  skipContext?: boolean;
}): Promise<MentorResponse> {
  const { userId, feature, featurePrompt, userMessage, skipContext } = params;
  const config = FEATURE_CONFIG[feature] || { temperature: 0.5, methodologyType: 'static' };

  // Step 1: Build context (skip for unauthenticated features)
  let userContext: UserContext;
  if (skipContext) {
    userContext = getEmptyContext();
  } else {
    userContext = await buildUserContext(userId);
  }

  // Step 2: Retrieve methodology
  const methodology = await retrieveMethodology(feature, userMessage);

  // Step 3: Get previous interactions
  const previousInteractions = skipContext ? '' : await getPreviousInteractions(userId, feature);

  // Step 4: Build prompt
  const systemPrompt = buildMentorPrompt({
    feature,
    featureSystemPrompt: featurePrompt,
    methodology,
    userContext,
    previousInteractions: previousInteractions || undefined,
  });

  // Step 5: Call OpenAI
  const rawResponse = await callOpenAI(systemPrompt, userMessage, config.temperature);

  // Step 6: Parse response
  let response: MentorResponse;
  try {
    response = JSON.parse(rawResponse);
  } catch (e) {
    throw new Error(
      `Failed to parse Mentor Engine response: ${e instanceof Error ? e.message : String(e)}. Raw: ${rawResponse.slice(0, 300)}`
    );
  }

  // Ensure required fields
  response = {
    inputQuality: response.inputQuality || 'decent_attempt',
    inputQualityExplanation: response.inputQualityExplanation || '',
    methodologyReference: response.methodologyReference || 'TechTalk Methodology',
    score: response.score,
    feedback: response.feedback || [],
    strengths: response.strengths || [],
    crossPhaseInsights: response.crossPhaseInsights || [],
    nextSteps: response.nextSteps || [],
    nextQuestion: response.nextQuestion,
    shouldRepeatAnalysis: response.shouldRepeatAnalysis ?? false,
    data: response.data,
  };

  // Step 7: Store interaction (non-blocking)
  storeInteraction(userId, feature, response, userMessage.slice(0, 500)).catch(() => {});

  return response;
}

// Helper for unauthenticated / no-database scenarios
function getEmptyContext(): UserContext {
  return {
    direction: { statement: null, score: null, role: '', industry: '', techStack: [], location: '' },
    cv: { parsed: null, score: null, analysisHistory: [] },
    skills: { detected: [], missing: [], strongest: [] },
    applications: {
      total: 0,
      thisWeek: 0,
      statuses: { researching: 0, tailoring: 0, applied: 0, networking: 0, interviewing: 0, offer: 0, rejected: 0, ghosted: 0 },
      companies: [],
      recentRejectionTimings: [],
    },
    networking: { contactsCount: 0, coffeeChatsDone: 0, messagesSent: 0, activeFollowUps: 0 },
    interviewPrep: { storiesCount: 0, storiesCategories: [], leetcodeProgress: { total: 0, solved: 0 } },
    phase: 'new',
  };
}

// Simplified caller for local-only mode (no Supabase)
export async function runMentorLocal(params: {
  feature: string;
  featurePrompt: string;
  userMessage: string;
  context?: Partial<UserContext>;
}): Promise<MentorResponse> {
  const config = FEATURE_CONFIG[params.feature] || { temperature: 0.5, methodologyType: 'static' };
  const userContext = { ...getEmptyContext(), ...params.context };

  const systemPrompt = buildMentorPrompt({
    feature: params.feature,
    featureSystemPrompt: params.featurePrompt,
    methodology: '',
    userContext,
  });

  const rawResponse = await callOpenAI(systemPrompt, params.userMessage, config.temperature);

  try {
    const response = JSON.parse(rawResponse);
    return {
      inputQuality: response.inputQuality || 'decent_attempt',
      inputQualityExplanation: response.inputQualityExplanation || '',
      methodologyReference: response.methodologyReference || 'TechTalk Methodology',
      score: response.score,
      feedback: response.feedback || [],
      strengths: response.strengths || [],
      crossPhaseInsights: response.crossPhaseInsights || [],
      nextSteps: response.nextSteps || [],
      nextQuestion: response.nextQuestion,
      shouldRepeatAnalysis: response.shouldRepeatAnalysis ?? false,
      data: response.data,
    };
  } catch (e) {
    throw new Error(`Failed to parse Mentor Engine response: ${e instanceof Error ? e.message : String(e)}`);
  }
}
