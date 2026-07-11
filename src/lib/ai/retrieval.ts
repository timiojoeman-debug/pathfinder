import { createServerClient, createAdminClient } from '@/lib/supabase/client';
import { CV_BLUEPRINT } from '@/lib/methodology/cv-blueprint';
import { NETWORKING_STRATEGY } from '@/lib/methodology/networking';
import { COFFEE_CHAT } from '@/lib/methodology/coffee-chat';
import { FOUR_PILLARS } from '@/lib/methodology/four-pillars';
import { INTERVIEW_PREP } from '@/lib/methodology/interview-prep';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 2000),
    }),
  });

  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

export async function retrieveRelevantMethodology(
  topic: string,
  userInput: string,
  maxChunks = 3
): Promise<string> {
  try {
    const embedding = await getEmbedding(`${topic}: ${userInput}`);
    const db = createServerClient();

    const { data: chunks } = await db.rpc('match_methodology', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: maxChunks,
    });

    if (chunks && chunks.length > 0) {
      return chunks.map((c: { title: string; chunk_text: string }) =>
        `[${c.title}]\n${c.chunk_text}`
      ).join('\n\n');
    }
  } catch {
    // Fall back silently
  }
  return '';
}

// One-time setup: chunk and embed all methodology content (admin — writes to public table)
export async function embedDocumentChunks(): Promise<void> {
  const db = createAdminClient();

  const chunks: { title: string; framework_name: string; topic: string; chunk_text: string }[] = [];

  // CV Blueprint chunks
  chunks.push({
    title: 'CV Screening Stages',
    framework_name: 'CV Blueprint',
    topic: 'cv',
    chunk_text: CV_BLUEPRINT.screeningStages.map(s => `${s.stage} (${s.timing}): ${s.detail}`).join('\n'),
  });
  chunks.push({
    title: 'CV Section Order',
    framework_name: 'CV Blueprint',
    topic: 'cv',
    chunk_text: CV_BLUEPRINT.sectionOrder.map(s => `${s.position}. ${s.name}: ${s.rule}`).join('\n'),
  });
  chunks.push({
    title: 'CV Formatting Rules',
    framework_name: 'CV Blueprint',
    topic: 'cv',
    chunk_text: CV_BLUEPRINT.formattingRules.join('\n'),
  });
  chunks.push({
    title: 'CV Bullet Formula',
    framework_name: 'CV Blueprint',
    topic: 'cv',
    chunk_text: `Structure: ${CV_BLUEPRINT.bulletFormula.structure}\nWeak examples: ${CV_BLUEPRINT.bulletFormula.weakExamples.map(e => e.text).join('; ')}\nStrong examples: ${CV_BLUEPRINT.bulletFormula.strongExamples.map(e => e.text).join('; ')}`,
  });
  chunks.push({
    title: 'CV ATS Checklist',
    framework_name: 'CV Blueprint',
    topic: 'ats',
    chunk_text: CV_BLUEPRINT.atsChecklist.map(c => c.item).join('\n'),
  });
  chunks.push({
    title: '15-Minute Tailoring Process',
    framework_name: 'CV Blueprint',
    topic: 'tailoring',
    chunk_text: CV_BLUEPRINT.tailoringProcess.steps.map(s => `${s.step}. ${s.action}`).join('\n'),
  });
  chunks.push({
    title: '7 Qualities of a Standout Project',
    framework_name: 'CV Blueprint',
    topic: 'projects',
    chunk_text: CV_BLUEPRINT.standoutProjectQualities.map(q => `${q.quality}: ${q.description}`).join('\n'),
  });

  // Networking chunks
  chunks.push({
    title: 'Hiring Priorities Pyramid',
    framework_name: 'Networking Strategy',
    topic: 'networking',
    chunk_text: NETWORKING_STRATEGY.hiringPyramid.join('\n') + `\nStats: ${NETWORKING_STRATEGY.stats.hiddenJobMarket} hidden market, ${NETWORKING_STRATEGY.stats.referralAdvantage} referral advantage`,
  });
  chunks.push({
    title: 'Outreach Variants',
    framework_name: 'Networking Strategy',
    topic: 'outreach',
    chunk_text: Object.entries(NETWORKING_STRATEGY.outreachVariants).map(([k, v]) => `${k}: When ${v.when}, lead with ${v.leadWith}`).join('\n'),
  });
  chunks.push({
    title: 'Startup Outreach Strategy',
    framework_name: 'Networking Strategy',
    topic: 'startup_outreach',
    chunk_text: `Target: ${NETWORKING_STRATEGY.startupOutreach.target}\nFrame: ${NETWORKING_STRATEGY.startupOutreach.frame}\nOffers: ${NETWORKING_STRATEGY.startupOutreach.offers.join(', ')}\nAsk: ${NETWORKING_STRATEGY.startupOutreach.ask}\nCritical: ${NETWORKING_STRATEGY.startupOutreach.criticalRule}`,
  });

  // Coffee Chat chunks
  chunks.push({
    title: 'Coffee Chat 4-Part Framework',
    framework_name: 'Coffee Chat Mastery',
    topic: 'coffee_chat',
    chunk_text: `Preparation: ${COFFEE_CHAT.framework.preparation}\nOpening: ${COFFEE_CHAT.framework.opening.script}\nCore: ${COFFEE_CHAT.framework.coreConversation}\nClosing: ${COFFEE_CHAT.framework.closing}`,
  });
  chunks.push({
    title: 'Follow-Up Cadence',
    framework_name: 'Coffee Chat Mastery',
    topic: 'follow_up',
    chunk_text: COFFEE_CHAT.followUpCadence.map(s => `Step ${s.step} (${s.timing}): ${s.purpose} — ${s.template}`).join('\n'),
  });
  chunks.push({
    title: 'Referral Ask Scripts',
    framework_name: 'Coffee Chat Mastery',
    topic: 'referral',
    chunk_text: `Direct: "${COFFEE_CHAT.referralAsks.direct}"\nIndirect: "${COFFEE_CHAT.referralAsks.indirect}"`,
  });

  // Four Pillars chunks
  chunks.push({
    title: 'Four Pillars of Job Search',
    framework_name: 'Four Pillars',
    topic: 'strategy',
    chunk_text: FOUR_PILLARS.pillars.join('\n') + `\nWeekly targets: ${JSON.stringify(FOUR_PILLARS.weeklyTargets)}`,
  });

  // Interview chunks
  chunks.push({
    title: 'Interview Prep Philosophy',
    framework_name: 'Interview Prep',
    topic: 'interview',
    chunk_text: `Philosophy: ${INTERVIEW_PREP.philosophy}\nSTAR: S=${INTERVIEW_PREP.star.situation}, T=${INTERVIEW_PREP.star.task}, A=${INTERVIEW_PREP.star.action}, R=${INTERVIEW_PREP.star.result}`,
  });
  chunks.push({
    title: 'Project Deep Dive Topics',
    framework_name: 'Interview Prep',
    topic: 'interview',
    chunk_text: Object.entries(INTERVIEW_PREP.projectDeepDiveTopics).map(([t, q]) => `${t}: ${q}`).join('\n'),
  });

  // Embed and insert each chunk
  for (const chunk of chunks) {
    try {
      const embedding = await getEmbedding(chunk.chunk_text);
      await db.from('methodology_chunks').upsert({
        title: chunk.title,
        framework_name: chunk.framework_name,
        topic: chunk.topic,
        chunk_text: chunk.chunk_text,
        embedding,
      }, { onConflict: 'title' });
    } catch (e) {
      console.error(`Failed to embed chunk "${chunk.title}":`, e);
    }
  }
}
