/**
 * Networking & Referrals — the highest-leverage domain in the TechTalk thesis:
 * "students who start early and manufacture warm connections outperform more
 * qualified peers who start late and apply cold."
 *
 * This file is pure data assembled against the schema in ../types.ts. It is the
 * reference implementation of the deep vertical slice; other domains follow the
 * same shape.
 */
import type { DomainKnowledge } from '../types';

const D = 'networking' as const;

export const NETWORKING_KNOWLEDGE: DomainKnowledge = {
  domain: D,

  // ── PRINCIPLES — the durable, most-queried truths ─────────────────────
  principles: [
    {
      id: 'p-referral-leverage',
      domain: D,
      statement:
        'A warm referral is worth far more than more cold applications — earning intros beats firing off volume.',
      rationale:
        'Referred candidates arrive pre-trusted, so they skip the noisiest, lowest-yield screening stage. Recruiters treat a referral as a credible signal that justifies an interview fast.',
      evidence: [
        'Cold applications convert at 3–5%; referred applications at 30–50% (~6–10× better).',
        'Referrals are 7% of applicants but 72% of interviews.',
        'One referral ≈ the interview odds of 10–15 cold applications.',
      ],
      sourceIds: ['wiki-referral-leverage', 'doc-hidden-market'],
      relatedConceptIds: ['c-referral-leverage', 'c-hidden-job-market'],
    },
    {
      id: 'p-hidden-market',
      domain: D,
      statement:
        'Most roles are filled before they are ever publicly posted — so the public posting is the worst place to compete.',
      rationale:
        'Internal candidates, hiring-manager networks, and employee referrals fill roles faster and cheaper than open postings. Cold applying is the employer\'s last resort and the candidate\'s most crowded channel.',
      evidence: [
        '70–80% of roles are filled before a public posting appears.',
        'Referrals/internal hires cut time-to-fill from 3–4 months to ~2 weeks.',
        'A single posting now draws hundreds of applications (often 200–500), far more than a few years ago.',
      ],
      sourceIds: ['wiki-hidden-job-market', 'doc-hidden-market'],
      relatedConceptIds: ['c-hidden-job-market', 'c-referral-leverage'],
    },
    {
      id: 'p-information-before-ask',
      domain: D,
      statement:
        'Ask for information first; let the referral follow once someone knows you. Never open with a job request.',
      rationale:
        'Trust precedes advocacy. People refer candidates they have a real (if brief) relationship with — a referral is the output of rapport, not the opening move.',
      evidence: [
        'The two hardest networking actions (per the source poll) are leading the conversation and asking for a referral — sequencing rapport first solves both.',
        '95% of people skip the 30-day follow-up where trust (and referrals) actually compound.',
      ],
      sourceIds: ['wiki-coffee-chat', 'doc-coffee-chat', 'wiki-referral-leverage'],
      relatedConceptIds: ['c-coffee-chat', 'c-referral-leverage'],
    },
    {
      id: 'p-balanced-search',
      domain: D,
      statement:
        'A job search stands on four pillars — brand, applications, networking, interview prep — and breaks at its weakest leg.',
      rationale:
        'Symptoms map to specific pillars, so the model is diagnostic: it tells you which leg to fix rather than just "try harder".',
      evidence: [
        'Few applications convert → Pillar 3 missing (all cold, no referral leverage).',
        'No interviews from applications → Pillar 1 (CV) or Pillar 2 (targeting) is broken.',
      ],
      sourceIds: ['wiki-four-pillars', 'doc-four-pillars'],
      relatedConceptIds: ['c-four-pillars'],
    },
  ],

  // ── FRAMEWORKS — repeatable mental structures ─────────────────────────
  frameworks: [
    {
      id: 'f-hiring-pyramid',
      domain: D,
      name: 'The Hiring Pyramid',
      purpose:
        'Shows where hires actually come from, so you spend effort in the highest-yield tier instead of the lowest.',
      appliesWhen: 'Deciding how to approach a target company before a role is posted.',
      steps: [
        { label: 'Tier 1 — Internal candidates', detail: 'Existing employees moving roles. Inaccessible to you, but explains why so many roles never reach the market.' },
        { label: "Tier 2 — Hiring manager's network", detail: 'People the manager already knows and trusts. This is what a coffee chat is quietly building toward.' },
        { label: 'Tier 3 — Internal referrals', detail: 'Recommendations from current employees — ~4× higher interview chances. The realistic target for an outsider.' },
        { label: 'Tier 4 — Cold applications', detail: 'Apply-and-hope. Lowest conversion. The default everyone else is stuck in.' },
      ],
      sourceIds: ['wiki-hidden-job-market', 'doc-hidden-market'],
    },
    {
      id: 'f-coffee-chat',
      domain: D,
      name: 'The Coffee Chat (four-part framework)',
      purpose:
        'A 20–30 minute informal conversation that builds rapport and enters the hidden job market — without asking for a job.',
      appliesWhen: 'Reaching out to a professional at a target company, before any vacancy exists.',
      steps: [
        { label: 'Open / rapport', detail: 'Genuine interest + one specific reason you reached out. (Carnegie: make it about them.)' },
        { label: 'Their story', detail: 'Ask about their path and work; listen more than you talk.' },
        { label: 'Your story (briefly)', detail: 'A crisp who-you-are + what you are building. Evidence over claims.' },
        { label: 'Forward motion', detail: 'One light, specific ask — advice, an intro, "what would you do in my shoes?" Never open with a referral request.' },
      ],
      sourceIds: ['wiki-coffee-chat', 'doc-coffee-chat'],
    },
    {
      id: 'f-outreach-variants',
      domain: D,
      name: 'Three Outreach Openers',
      purpose:
        'Pick the strongest honest opener for a cold message, ranked by connection strength. Never fabricate the connection.',
      appliesWhen: 'Writing the first message to someone you have no prior relationship with.',
      steps: [
        { label: 'Shared connection', detail: 'Lead with a real shared university, city, team, or mutual contact — the strongest opener.' },
        { label: 'Content hook', detail: 'Reference a specific post, article, or talk they actually published — proves you did the work.' },
        { label: 'Curiosity & humility', detail: 'Fallback: honest curiosity and an admission you have no strong connection. Honesty beats a forced link.' },
      ],
      sourceIds: ['wiki-networking', 'doc-linkedin-checklist'],
    },
  ],

  // ── CONCEPTS — atomic teachable ideas ─────────────────────────────────
  concepts: [
    {
      id: 'c-referral-leverage',
      domain: D,
      term: 'Referral Leverage',
      definition:
        'The outsized advantage a warm referral gives over a cold application — the single most important number in the job-search plan.',
      purpose:
        'Reframes networking from a "soft extra" into the highest-leverage activity, so you invest time in earning intros rather than firing off more applications.',
      prerequisiteIds: ['c-hidden-job-market'],
      examples: [
        'Spending an hour earning a warm intro is worth more than an hour submitting 10 cold applications.',
        'Two or three referrals manufactured over a summer can outweigh a whole autumn of cold applying.',
      ],
      antiPatterns: [
        'Treating referrals as something you bluntly "ask for" on first contact.',
        'Measuring effort by applications submitted instead of relationships built.',
      ],
      relatedConceptIds: ['c-hidden-job-market', 'c-coffee-chat'],
      principleIds: ['p-referral-leverage', 'p-information-before-ask'],
      sourceIds: ['wiki-referral-leverage'],
    },
    {
      id: 'c-hidden-job-market',
      domain: D,
      term: 'The Hidden Job Market',
      definition:
        'The 70–80% of roles filled before any public posting, through internal candidates, manager networks, referrals, and recruiter outreach.',
      purpose:
        'Explains why cold applying loses and where to actually look — it is the employer-side view of why referrals dominate.',
      prerequisiteIds: [],
      examples: [
        'Following 20–30 target employers on LinkedIn and marking "interested" before a role opens.',
        'Connecting with an engineer in your target role months before any vacancy exists.',
        'For first-years, small startups (2–50 staff) are the most accessible entry point.',
      ],
      antiPatterns: [
        'Only applying to roles after they are publicly posted.',
        'Competing in the several-hundred-applicant pile and calling it "doing everything right".',
      ],
      relatedConceptIds: ['c-referral-leverage', 'c-coffee-chat'],
      principleIds: ['p-hidden-market'],
      sourceIds: ['wiki-hidden-job-market'],
    },
    {
      id: 'c-coffee-chat',
      domain: D,
      term: 'The Coffee Chat',
      definition:
        'An informal 20–30 minute conversation with a professional to learn and build rapport — explicitly not to ask for a job.',
      purpose:
        'The primary tool for entering the hidden job market and the mechanism by which referrals are earned.',
      prerequisiteIds: ['c-hidden-job-market'],
      examples: [
        'A LinkedIn video call where you ask an engineer about their path, share what you are building, and end with a light advice ask.',
        'A 24-hour thank-you that references one specific thing you will act on.',
      ],
      antiPatterns: [
        'Opening with "can you refer me?" before any rapport exists.',
        'Talking more than you listen.',
        'Skipping the 30-day follow-up — the move 95% of people miss.',
      ],
      relatedConceptIds: ['c-referral-leverage', 'c-hidden-job-market'],
      principleIds: ['p-information-before-ask'],
      sourceIds: ['wiki-coffee-chat'],
    },
    {
      id: 'c-four-pillars',
      domain: D,
      term: 'The Four Pillars of a Job Search',
      definition:
        'The structural model of a balanced search: personal brand, targeted applications, networking & referrals, and interview prep.',
      purpose:
        'A diagnostic: when the search is not working, the pillars tell you which leg is broken instead of leaving you to "try harder".',
      prerequisiteIds: [],
      examples: [
        'Interviews but no offers → invest in Pillar 4 (interview prep).',
        'Applications but no interviews → fix Pillar 1 (CV) or Pillar 2 (targeting).',
      ],
      antiPatterns: [
        'Over-investing in one pillar (e.g. endless CV tweaks) while a neglected pillar is the real bottleneck.',
      ],
      relatedConceptIds: ['c-referral-leverage', 'c-hidden-job-market'],
      principleIds: ['p-balanced-search'],
      sourceIds: ['wiki-four-pillars'],
    },
  ],

  // ── PLAYBOOKS — executable procedures ─────────────────────────────────
  playbooks: [
    {
      id: 'pb-earn-referral',
      domain: D,
      name: 'Earn a Referral From Cold',
      goal: 'Convert a stranger at a target company into a warm referral, the right way.',
      whenToUse: 'You have a target company but no existing contact there, and ideally no posted role yet.',
      steps: [
        { action: 'Build a target list of 20–30 employers and follow them on LinkedIn, marking "interested".', why: 'Enters the hidden job market and triggers recruiter-side signals before any vacancy.', learn: 'c-hidden-job-market' },
        { action: 'Find a peer or hiring manager in your target role (use alumni networks first).', why: 'Shared education is the strongest warm connection and the most responsive contact.', learn: 'c-hidden-job-market' },
        { action: 'Send a personalised opener using the strongest honest variant (shared connection > content hook > curiosity).', why: 'A real, specific opener earns a reply; a fabricated one destroys trust.', learn: 'c-coffee-chat' },
        { action: 'Run a 20–30 min coffee chat: their story, your story, one light ask — never a referral request.', why: 'Trust precedes advocacy; the ask comes later, after rapport.', learn: 'c-coffee-chat' },
        { action: 'Follow up within 24h, then again at 30 days with "I tried X you suggested".', why: 'The 30-day touchpoint is where referrals form — and where 95% of people quit.', learn: 'c-referral-leverage' },
      ],
      successCriteria: [
        'At least one professional who remembers you and would vouch for you.',
        'A referral offered (or comfortably askable) without you having led with the request.',
      ],
      conceptIds: ['c-referral-leverage', 'c-hidden-job-market', 'c-coffee-chat'],
      sourceIds: ['wiki-coffee-chat', 'wiki-referral-leverage', 'doc-coffee-chat'],
    },
    {
      id: 'pb-weekly-cadence',
      domain: D,
      name: 'Sustainable Networking Cadence',
      goal: 'Keep networking compounding without burning out, by making it a small daily/weekly habit.',
      whenToUse: 'Ongoing, from the moment you start a search until you sign an offer.',
      steps: [
        { action: 'Send ~3 personalised connection requests per week.', why: 'Steady inflow beats sporadic bursts; relationships need lead time.', learn: 'c-hidden-job-market' },
        { action: 'Run one coffee chat every 1–2 weeks. (30-day sprint option: ~10 recruiter + ~10 peer/hiring-manager messages and 2–3 coffee chats a week.)', why: 'A realistic, repeatable rate that builds a real network over a season.', learn: 'c-coffee-chat' },
        { action: 'Post or comment thoughtfully once a week.', why: 'Visibility makes you the person a recruiter or peer already half-knows.', learn: 'c-referral-leverage' },
        { action: 'Do a bi-weekly follow-up sweep of all active contacts.', why: 'Most people are busy, not uninterested — the follow-up is what keeps you alive in their mind.', learn: 'c-coffee-chat' },
      ],
      successCriteria: [
        '10–15 real, logged contacts over a season.',
        'A follow-up cadence you actually sustain, not a one-week sprint.',
      ],
      conceptIds: ['c-coffee-chat', 'c-referral-leverage'],
      sourceIds: ['wiki-networking', 'doc-coffee-chat'],
    },
  ],

  // ── EXAMPLES — concrete, pattern-matchable cases ──────────────────────
  examples: [
    {
      id: 'ex-alumni-opener',
      domain: D,
      title: 'The alumni opener',
      scenario: 'You want to reach an engineer at a fintech you are targeting; you share a university.',
      goodMove:
        '"Hi — fellow [University] grad here. I saw you moved from [X] into payments infra at [Company]; I am building a RAG career tool and curious how your team thinks about retrieval quality. Could I ask you two questions?"',
      badMove:
        '"Hi, I would love to connect!" — or worse, "Can you refer me to your team?" on first contact.',
      conceptIds: ['c-coffee-chat', 'c-referral-leverage'],
      sourceIds: ['wiki-coffee-chat', 'doc-linkedin-checklist'],
    },
    {
      id: 'ex-30-day-followup',
      domain: D,
      title: 'The 30-day follow-up that 95% skip',
      scenario: 'Three weeks after a helpful coffee chat, you have nothing "due".',
      goodMove:
        '"You suggested I look at [X] — I tried it on PathFinder and callbacks moved from 2 to 5. Thank you. If a junior role opens on your team I would love to throw my hat in."',
      badMove: 'Going silent until you suddenly need something, then asking cold.',
      conceptIds: ['c-coffee-chat', 'c-referral-leverage'],
      sourceIds: ['wiki-coffee-chat'],
    },
  ],

  // ── METRICS — what to track to know it is working ─────────────────────
  metrics: [
    {
      id: 'm-referral-rate',
      domain: D,
      name: 'Referral rate',
      definition: 'Share of your applications that go in with a warm referral.',
      target: 'Trend upward every month; even 1 in 5 changes your odds dramatically.',
      why: 'Referred applications convert ~6–10× better, so this single number predicts interview volume more than total applications.',
      sourceIds: ['wiki-referral-leverage'],
    },
    {
      id: 'm-active-contacts',
      domain: D,
      name: 'Active warm contacts',
      definition: 'People who remember you and would respond to a follow-up.',
      target: '10–15 real, logged contacts over a search season.',
      why: 'The hidden job market is reached through people, not postings — this is your access surface to it.',
      sourceIds: ['wiki-networking', 'wiki-coffee-chat'],
    },
  ],

  // ── DECISION RULES — condition → educational recommendation ───────────
  decisionRules: [
    {
      id: 'dr-all-cold',
      domain: D,
      when: 'The user has applied a lot but has almost no warm contacts.',
      match: (ctx) => ctx.applicationsTotal >= 10 && ctx.contactsCount <= 2,
      recommend:
        'Pause volume. Redirect this week into building 3 warm contacts at your top target companies before sending more cold applications.',
      rationale:
        'You are competing entirely in the lowest-yield channel. One referral is worth 10–15 cold applications, so the marginal hour is far better spent on a warm intro than another submission.',
      principleId: 'p-referral-leverage',
      teachesConceptId: 'c-referral-leverage',
      priority: 90,
    },
    {
      id: 'dr-no-coffee-chats',
      domain: D,
      when: 'The user has some contacts but has not converted them into conversations.',
      match: (ctx) => ctx.contactsCount >= 3 && ctx.coffeeChatsDone === 0,
      recommend:
        'Turn 2 of your existing contacts into coffee chats this fortnight using the four-part framework — open, their story, your story, one light ask.',
      rationale:
        'Contacts who never become conversations never become referrals. The coffee chat is the mechanism that converts a connection into someone who will vouch for you.',
      principleId: 'p-information-before-ask',
      teachesConceptId: 'c-coffee-chat',
      priority: 80,
    },
    {
      id: 'dr-deadline-warm',
      domain: D,
      when: 'A target application window opens soon and the user already has contacts.',
      match: (ctx) => (ctx.daysToDeadline ?? Infinity) <= 14 && ctx.contactsCount >= 1,
      recommend:
        'Send your warm contacts a short heads-up now: mention the upcoming role and ask if they would be open to referring you when it opens.',
      rationale:
        'Apply-early plus an existing relationship is the strongest possible position — being already "warm" when a fast-filling role opens is what wins it.',
      principleId: 'p-hidden-market',
      teachesConceptId: 'c-hidden-job-market',
      priority: 85,
    },
    {
      id: 'dr-beginner-start',
      domain: D,
      when: 'A beginner with no contacts and few applications is just starting out.',
      match: (ctx) => ctx.experienceLevel === 'beginner' && ctx.contactsCount === 0,
      recommend:
        'Start with the foundations: build a target list of 20–30 employers, follow them, and find 5 alumni in your target role to reach out to.',
      rationale:
        'Before any outreach can work you need a surface to reach the hidden job market — a target list and warm-leaning first contacts (alumni) are the cheapest entry point.',
      principleId: 'p-hidden-market',
      teachesConceptId: 'c-hidden-job-market',
      priority: 60,
    },
  ],

  // ── LEARNING PATHS — staged curriculum ────────────────────────────────
  learningPaths: [
    {
      id: 'lp-networking-beginner',
      domain: D,
      level: 'beginner',
      title: 'Build Your Networking Foundation',
      outcome: 'You understand why warm beats cold and have your first real contacts.',
      modules: [
        {
          id: 'lm-why-warm',
          title: 'Why warm beats cold',
          objective: 'Internalise referral leverage and the hidden job market.',
          conceptIds: ['c-referral-leverage', 'c-hidden-job-market'],
          playbookIds: [],
          completionCriteria: 'You can state the ~6–10× referral advantage and explain why cold applying loses.',
          exercise: 'Write, in two sentences, why you will spend the next hour on a warm intro instead of 10 more applications.',
        },
        {
          id: 'lm-target-list',
          title: 'Build your target surface',
          objective: 'Create the list and follows that give you access to the hidden market.',
          conceptIds: ['c-hidden-job-market'],
          playbookIds: ['pb-earn-referral'],
          completionCriteria: 'A list of 20–30 followed target employers and 5 alumni identified.',
          exercise: 'Draft your 20–30 employer list and find 5 alumni in your target role.',
        },
      ],
    },
    {
      id: 'lp-networking-intermediate',
      domain: D,
      level: 'intermediate',
      title: 'Execute the Coffee Chat Engine',
      outcome: 'You run coffee chats on a sustainable cadence and follow up where others quit.',
      modules: [
        {
          id: 'lm-coffee-chat',
          title: 'Run a coffee chat',
          objective: 'Apply the four-part framework without asking for a job.',
          conceptIds: ['c-coffee-chat'],
          playbookIds: ['pb-earn-referral'],
          completionCriteria: 'Two coffee chats completed with 24-hour follow-ups sent.',
          exercise: 'Run one coffee chat this fortnight and send the 24-hour thank-you.',
        },
        {
          id: 'lm-cadence',
          title: 'Make it compound',
          objective: 'Sustain a weekly cadence and the 30-day follow-up.',
          conceptIds: ['c-coffee-chat', 'c-referral-leverage'],
          playbookIds: ['pb-weekly-cadence'],
          completionCriteria: 'A four-week streak of the weekly cadence with a follow-up sweep done.',
          exercise: 'Schedule the weekly cadence and a recurring 30-day follow-up reminder.',
        },
      ],
    },
    {
      id: 'lp-networking-advanced',
      domain: D,
      level: 'advanced',
      title: 'Manufacture Referrals at Scale',
      outcome: 'You consistently convert relationships into referrals into your target roles.',
      modules: [
        {
          id: 'lm-referral-conversion',
          title: 'Convert rapport into referrals',
          objective: 'Time the ask and pair it with apply-early to win fast-filling roles.',
          conceptIds: ['c-referral-leverage', 'c-hidden-job-market'],
          playbookIds: ['pb-earn-referral'],
          completionCriteria: 'Referral rate trending up; at least one referral secured for a target role.',
          exercise: 'Identify your three warmest contacts and the role each could realistically refer you to.',
        },
      ],
    },
  ],
};
