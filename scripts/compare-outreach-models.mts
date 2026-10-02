/* eslint-disable @typescript-eslint/no-explicit-any -- one-off trial script, dynamic ssrLoadModule results */
/**
 * Compare gpt-4o and gpt-4.1-mini on the mentor engine's outreach prompt.
 * 10 fictional requests x 2 models = 20 paid calls, no retries, no Supabase, no RAG.
 *
 *   ENV_FILE=path/to/.env.local node scripts/compare-outreach-models.mts out.json
 *
 * Key: process.env.OPENAI_API_KEY, else that single line of ENV_FILE. Never printed.
 * DRY=1 builds every prompt and exits without calling the API.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? 'trial-results.json';

function loadKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const f = process.env.ENV_FILE;
  if (!f) throw new Error('Set OPENAI_API_KEY or ENV_FILE');
  const m = readFileSync(f, 'utf8').match(/^OPENAI_API_KEY\s*=\s*(.*)$/m);
  if (!m) throw new Error('OPENAI_API_KEY not found');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

type Case = {
  id: string; label: string;
  type: 'recruiter' | 'hiringManager' | 'peer';
  recipientName: string; senderName: string; roleTitle: string; company: string;
  technologies: string; sharedAttributes?: string;
  summary?: string; connectionPoints?: string[]; outreachAngles?: string[];
};

// All people and the companies marked "fictional" are invented.
const CASES: Case[] = [
  { id: 'P01', label: 'Alumni peer, Edinburgh to Monzo', type: 'peer', recipientName: 'Fiona Maclaren', senderName: 'Callum Reid', roleTitle: 'Software Engineering Intern', company: 'Monzo', technologies: 'TypeScript, React, Node.js', sharedAttributes: 'Both studied Informatics at the University of Edinburgh (Fiona graduated 2023)', summary: 'Backend engineer on the payments team, ex-Edinburgh, writes about incident reviews', connectionPoints: ['University of Edinburgh Informatics alumna'], outreachAngles: ['Ask how she moved from university projects to production payments work'] },
  { id: 'P02', label: 'Cold peer engineer, no shared ground, Wise', type: 'peer', recipientName: 'Tobias Wren', senderName: 'Amara Nwosu', roleTitle: 'Data Science Intern', company: 'Wise', technologies: 'Python, pandas, scikit-learn, SQL' },
  { id: 'R03', label: 'Recruiter, Barclays technology summer analyst', type: 'recruiter', recipientName: 'Helen Ashworth', senderName: 'Josh Patel', roleTitle: 'Technology Summer Analyst', company: 'Barclays', technologies: 'Java, Python, SQL', summary: 'University recruiter for technology early careers', outreachAngles: ['Ask which stage of the application process to prepare for'] },
  { id: 'H04', label: 'Hiring manager, ML research (fictional Halcyon Labs)', type: 'hiringManager', recipientName: 'Dr Priyanka Venkataraman', senderName: 'Elliot Thornton', roleTitle: 'Machine Learning Research Intern', company: 'Halcyon Labs', technologies: 'PyTorch, Python, NumPy', summary: 'Leads a small team on efficient transformer inference; recently posted about quantisation trade-offs', connectionPoints: ['Posted a thread on 8-bit quantisation'], outreachAngles: ['Comment thoughtfully on her quantisation thread'] },
  { id: 'F05', label: 'Startup founder, London seed-stage (fictional Pennywise)', type: 'hiringManager', recipientName: 'Declan Okafor', senderName: 'Mei Lin Chan', roleTitle: 'Founding Engineer Intern', company: 'Pennywise', technologies: 'Next.js, Postgres, TypeScript', summary: 'Co-founder and CEO of a seed-stage London startup building budgeting tools for students', outreachAngles: ['Offer a specific observation as a student user'] },
  { id: 'P06', label: 'Peer, Cardiff, placement year at Arm', type: 'peer', recipientName: 'Sana Iqbal', senderName: 'Rhys Hughes', roleTitle: 'Embedded Software Intern', company: 'Arm', technologies: 'C, C++, RTOS, Python', sharedAttributes: 'Both from Cardiff; Rhys is at Cardiff University, Sana did a placement year at Arm', summary: 'Embedded firmware engineer, did a placement year before graduating' },
  { id: 'R07', label: 'Recruiter, no profile detail, Deloitte', type: 'recruiter', recipientName: 'Unknown', senderName: 'Grace Adeyemi', roleTitle: 'Technology Consulting Intern', company: 'Deloitte', technologies: 'Python, Power BI, Excel' },
  { id: 'H08', label: 'Hiring manager, content hook (fictional Bloomsbury Robotics)', type: 'hiringManager', recipientName: 'Marcus Feldman', senderName: 'Isla Campbell', roleTitle: 'Robotics Software Intern', company: 'Bloomsbury Robotics', technologies: 'C++, ROS 2, Python', summary: 'Engineering lead for warehouse picking robots; gave a talk on sim-to-real transfer at a UK robotics meetup', connectionPoints: ['Talk on sim-to-real transfer'], outreachAngles: ['Ask one question about the sim-to-real talk'] },
  { id: 'P09', label: 'Society peer, Manchester (fictional Larkspur Analytics)', type: 'peer', recipientName: 'Yusuf Demir', senderName: 'Hannah Whitfield', roleTitle: 'Software Engineering Intern', company: 'Larkspur Analytics', technologies: 'Java, Spring, React', sharedAttributes: 'Both members of the University of Manchester Computer Science Society', summary: 'Forward-deployed engineer, former Manchester CompSoc committee member' },
  { id: 'R10', label: 'Recruiter, Glasgow scale-up (fictional Thistle Health)', type: 'recruiter', recipientName: 'Eilidh Bruce', senderName: 'Kwame Asante', roleTitle: 'Full-Stack Intern', company: 'Thistle Health', technologies: 'Vue, Node.js, PostgreSQL, Docker', summary: 'Talent partner hiring interns for a health-tech scale-up in Glasgow', connectionPoints: ['Posted that summer 2027 intern applications open in November'], outreachAngles: ['Reference the November opening post'] },
];

const MODELS = ['gpt-4o', 'gpt-4.1-mini'] as const;

async function main() {
  const dry = process.env.DRY === '1';
  const key = dry ? '' : loadKey();
  const vite = await createServer({
    root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true },
    resolve: { alias: { '@': path.join(root, 'src') } },
  });
  const eng: any = await vite.ssrLoadModule('/src/lib/ai/mentor-engine.ts');
  const prompts: any = await vite.ssrLoadModule('/src/lib/prompts/index.ts');
  const know: any = await vite.ssrLoadModule('/src/lib/knowledge/index.ts');
  const nat: any = await vite.ssrLoadModule('/src/lib/ai/naturalness-check.ts');
  const aiLib: any = await vite.ssrLoadModule('/src/lib/ai.ts');

  const results: any[] = [];
  for (const c of CASES) {
    // Mirrors src/app/api/networking/outreach/route.ts
    const studentProfile = [`Sender: ${c.senderName}`, `Target role: ${c.roleTitle}`, `Technologies: ${c.technologies}`].join('; ');
    const contactProfile = [
      `Recipient: ${c.recipientName}`, `Company: ${c.company}`,
      c.sharedAttributes ? `Shared attributes: ${c.sharedAttributes}` : '',
      (c.summary || c.connectionPoints || c.outreachAngles)
        ? `Profile insights: Summary: ${c.summary || 'N/A'}; Connection points: ${(c.connectionPoints ?? []).join('; ')}; Outreach angles: ${(c.outreachAngles ?? []).join('; ')}` : '',
    ].filter(Boolean).join('; ');
    const featurePrompt = prompts.buildOutreachPrompt({ studentProfile, contactProfile, contactType: c.type, roleName: c.roleTitle });
    const userMessage = 'Generate the outreach message, 5 coffee chat questions, 5 conversation topics, and a follow-up template. Personalise using the contact profile.';
    const feature = ({ recruiter: 'outreach-recruiter', hiringManager: 'outreach-hiring-manager', peer: 'outreach-peer' } as const)[c.type];
    // Static path: no RAG, no Supabase, empty student context; knowledge block as in runMentorEngine.
    const system = eng.buildMentorPrompt({
      feature, featureSystemPrompt: featurePrompt,
      methodology: know.renderKnowledgeBlock(userMessage, eng.FEATURE_DOMAIN[feature]),
      userContext: eng.getEmptyContext(),
    });
    const temperature = eng.FEATURE_CONFIG[feature].temperature;
    if (dry) { console.log(c.id, system.length, 'chars, temp', temperature); continue; }

    const runs: any = {};
    for (const model of MODELS) {
      const t0 = Date.now();
      const r: any = { model, temperature };
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, temperature, messages: [{ role: 'system', content: system }, { role: 'user', content: userMessage }] }),
        });
        r.latencyMs = Date.now() - t0;
        if (!res.ok) { r.error = `HTTP ${res.status}`; }
        else {
          const j: any = await res.json();
          r.usage = j.usage; r.raw = j.choices?.[0]?.message?.content ?? '';
          try {
            r.parsed = JSON.parse(r.raw); r.jsonOk = true;
            r.message = aiLib.envelopeMessage(r.parsed);
          } catch { r.jsonOk = false; r.message = ''; }
          if (r.message) {
            r.naturalness = nat.checkNaturalness(r.message, { type: 'outreach' });
            r.naturalnessUk = nat.checkNaturalness(r.message, { type: 'outreach', region: 'uk' });
          }
        }
      } catch (e) { r.latencyMs = Date.now() - t0; r.error = e instanceof Error ? e.message : String(e); }
      runs[model] = r;
    }
    results.push({ case: c, systemChars: system.length, runs });
    writeFileSync(out, JSON.stringify(results, null, 2));
    console.log(c.id, MODELS.map(m => `${m}:${runs[m].error ?? runs[m].usage?.total_tokens}`).join(' '));
  }
  await vite.close();
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
