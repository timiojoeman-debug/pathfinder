/**
 * Jobs — Applications, Timing & Targeting.
 *
 * The second-highest-leverage truth after networking: timing is a strategy.
 * Rolling admissions mean day-one applications win, while high-volume cold
 * applying is now a losing game against AI screening. Pairs with the networking
 * domain (warm intros) to form the "start early + go warm" thesis.
 *
 * Same schema and shape as domains/networking.ts.
 */
import type { DomainKnowledge } from '../types';

const D = 'jobs' as const;

export const JOBS_KNOWLEDGE: DomainKnowledge = {
  domain: D,

  // ── PRINCIPLES ────────────────────────────────────────────────────────
  principles: [
    {
      id: 'p-apply-early',
      domain: D,
      statement:
        'Timing is a strategy in itself — because nearly every employer uses rolling admissions, the first day a posting is live is the best day to apply.',
      rationale:
        'Recruiters work the inbox top-down and OA/screening quotas fill, so early applicants are reviewed against an emptier pile and a fresher reader.',
      evidence: [
        'Applying within 24–48 hours of a posting going live means your application is read before the pile builds.',
        'Some roles (parts of Jane Street, certain Meta New Grad, Google\'s ~2–4 week window) genuinely fill in days.',
      ],
      sourceIds: ['wiki-apply-early', 'doc-10-interviews', 'wiki-application-strategy'],
      relatedConceptIds: ['c-apply-early'],
    },
    {
      id: 'p-volume-cold-fails',
      domain: D,
      statement:
        'High-volume cold applying is now a losing strategy — quantity competes in the most crowded, AI-screened channel.',
      rationale:
        'AI mass-applying inflated volume while ~85% of companies use AI screening, so generic applications are often screened out before a person reads them and recruiters only read a fraction of the pile.',
      evidence: [
        'Application volume is several times higher than a few years ago.',
        'A posting gets hundreds of applications (often 200–500); ~80% are irrelevant; recruiters review only ~20–30%.',
        '30+ untargeted applications typically returns silence ("ghosting").',
      ],
      sourceIds: ['wiki-job-search-system', 'doc-hidden-market'],
      relatedConceptIds: ['c-ai-screening', 'c-apply-early'],
    },
    {
      id: 'p-targeted-tailored',
      domain: D,
      statement:
        'Targeted + tailored + warm beats high-volume + generic + cold — every time, in the 2026 market.',
      rationale:
        'A curated target list applied to early and tailored per role survives both the AI filter and the recruiter scan, and pairs with referrals to skip the pile entirely.',
      evidence: [
        'A realistic funnel: 35–40 tailored applications a month → ~15–25% OAs → … → 1–4 offers.',
        'The three fatal mistakes are: no direction, generic materials, and cold-only.',
      ],
      sourceIds: ['wiki-job-search-system', 'doc-four-pillars'],
      relatedConceptIds: ['c-application-funnel', 'c-apply-early'],
    },
  ],

  // ── FRAMEWORKS ────────────────────────────────────────────────────────
  frameworks: [
    {
      id: 'f-hire',
      domain: D,
      name: 'The HIRE Framework',
      purpose:
        'A step-by-step strategy for landing a role before graduating: pick a target, work it daily, reach into the hidden market, and convert.',
      appliesWhen: 'Structuring an entire job-search campaign from scratch.',
      steps: [
        { label: 'Direction', detail: 'Pick a specific target role/industry — no scattergun applying.' },
        { label: 'Intensify', detail: 'Focused daily effort, not sporadic bursts (compounding).' },
        { label: 'Reach', detail: 'Proactive outreach into the hidden job market.' },
        { label: 'Excel', detail: 'Convert via strong interview performance.' },
      ],
      sourceIds: ['wiki-job-search-system'],
    },
    {
      id: 'f-posting-calendar',
      domain: D,
      name: 'The Rolling-Admissions Posting Calendar',
      purpose:
        'Know when target employers open so you can apply day-one, before fast-filling windows close.',
      appliesWhen: 'Planning an internship/grad cycle around known opening months.',
      steps: [
        { label: 'Watch early', detail: 'July–Aug: early openers (Amazon, Databricks, Microsoft) — check pages weekly, apply the day they open.' },
        { label: 'Peak rush', detail: 'September: Meta, Apple, Bloomberg, Palantir — apply immediately, set all alerts, begin outreach.' },
        { label: 'Short windows', detail: 'Mid-October: Google opens a ~2–4 week window — apply IMMEDIATELY; it closes before most notice.' },
        { label: 'Stragglers', detail: 'November onward: tier-2 and late openers — keep applying.' },
      ],
      sourceIds: ['wiki-application-strategy'],
    },
    {
      id: 'f-application-funnel',
      domain: D,
      name: 'The Application Funnel',
      purpose:
        'Set realistic volume targets and diagnose where you leak, instead of guessing.',
      appliesWhen: 'Deciding how many roles to target and reading your own conversion.',
      steps: [
        { label: 'Apply', detail: '35–40 tailored applications a month (diversify beyond one tier).' },
        { label: 'OA', detail: '~15–25% convert to online assessments.' },
        { label: 'Screen → final', detail: '~30–50% at each subsequent stage.' },
        { label: 'Offer', detail: '~30–60% of finals → 1–4 offers overall.' },
      ],
      sourceIds: ['wiki-application-strategy'],
    },
  ],

  // ── CONCEPTS ──────────────────────────────────────────────────────────
  concepts: [
    {
      id: 'c-apply-early',
      domain: D,
      term: 'Apply Early',
      definition:
        'Treating timing as a strategy: because employers use rolling admissions, applying within 24–48 hours of a posting means your application is read before the pile builds.',
      purpose:
        'Shifts effort from "perfect the application forever" to "be ready before the posting opens and apply day-one".',
      prerequisiteIds: [],
      examples: [
        'Applying to Google within the first days of its mid-October window, which can close in 2–4 weeks.',
        'Having CV variants, autofill, and references ready so you can apply within 24–48 hours of a posting going live.',
      ],
      antiPatterns: [
        'Polishing an application for a week while the OA quota fills.',
        'Discovering fast-filling roles only after they have closed.',
      ],
      relatedConceptIds: ['c-application-funnel', 'c-ai-screening'],
      principleIds: ['p-apply-early'],
      sourceIds: ['wiki-apply-early'],
    },
    {
      id: 'c-ai-screening',
      domain: D,
      term: 'AI Screening Reality',
      definition:
        'The fact that ~85% of companies use automated screening, so generic, untargeted applications are often screened out before or alongside a human read — making volume-only strategies fail.',
      purpose:
        'Explains why cold mass-applying produces silence, and why tailoring + warm intros are the escape.',
      prerequisiteIds: [],
      examples: [
        'A tailored master-CV per role that passes the ATS filter and the 6–8s recruiter scan.',
        'Reaching the hidden job market via referral to skip the AI pile entirely.',
      ],
      antiPatterns: [
        'Using AI to mass-apply with one generic CV.',
        'Rewriting the whole CV from scratch each time instead of tailoring a strong master.',
      ],
      relatedConceptIds: ['c-apply-early', 'c-application-funnel'],
      principleIds: ['p-volume-cold-fails'],
      sourceIds: ['wiki-job-search-system'],
    },
    {
      id: 'c-application-funnel',
      domain: D,
      term: 'The Application Funnel',
      definition:
        'The conversion math of a search — from tailored applications through OAs, screens, and finals to a realistic 1–4 offers.',
      purpose:
        'Replaces vague effort with a target (35–40 tailored applications a month) and a way to diagnose where you leak.',
      prerequisiteIds: ['c-apply-early'],
      examples: [
        'Tracking that you sent 90 applications, got 18 OAs, and reached 4 finals — and seeing your weakest stage.',
        'Diversifying beyond one tier (quant, fintech, tier-2 tech) to keep the top of the funnel wide.',
      ],
      antiPatterns: [
        'Judging the search by raw application count instead of stage conversion.',
        'Concentrating all applications in one tier and starving the funnel.',
      ],
      relatedConceptIds: ['c-apply-early', 'c-ai-screening'],
      principleIds: ['p-targeted-tailored'],
      sourceIds: ['wiki-application-strategy'],
    },
  ],

  // ── PLAYBOOKS ─────────────────────────────────────────────────────────
  playbooks: [
    {
      id: 'pb-application-day',
      domain: D,
      name: 'Be Ready Before Postings Open',
      goal: 'Apply to any role within 24–48 hours of it going live, so you are read before the pile builds.',
      whenToUse: 'In the weeks before a cycle opens, and on every application day.',
      steps: [
        { action: 'Prepare an ATS-friendly one-page master CV plus sector-tailored variants (e.g. big tech / fintech / quant).', why: 'Tailoring survives the AI filter; having variants ready removes the day-of bottleneck.', learn: 'c-ai-screening' },
        { action: 'Pre-fill all personal info in a password manager for autofill, and line up references in advance.', why: 'Most application time is data entry — eliminate it ahead of the rush.', learn: 'c-apply-early' },
        { action: 'Keep a tracker (company / role / date / status / contacts / next action).', why: 'You cannot read your funnel or time follow-ups without it.', learn: 'c-application-funnel' },
        { action: 'When a target posting drops, apply the same day — tailor the master, do not rewrite from scratch.', why: 'Early applications are read before the pile builds; rewriting wastes the window.', learn: 'c-apply-early' },
      ],
      successCriteria: [
        'You can submit a tailored application within 24–48 hours of a posting going live.',
        'No fast-filling target role closes before you have applied.',
      ],
      conceptIds: ['c-apply-early', 'c-ai-screening', 'c-application-funnel'],
      sourceIds: ['wiki-application-strategy', 'doc-10-interviews'],
    },
    {
      id: 'pb-monitoring-stack',
      domain: D,
      name: 'Build the Monitoring Stack',
      goal: 'See postings the day they open — ideally before the career page updates.',
      whenToUse: 'Standing setup, refreshed at the start of each cycle.',
      steps: [
        { action: 'Star/watch the canonical GitHub internship aggregators for your cycle year.', why: 'They surface postings fastest and in one place.', learn: 'c-apply-early' },
        { action: 'Bookmark target company career pages and run a fixed weekly check (e.g. Monday morning).', why: 'Some roles appear on company pages before aggregators catch them.', learn: 'c-apply-early' },
        { action: 'Set 5–10 LinkedIn Job Alerts plus any campus/careers portals.', why: 'Daily alerts cover the long tail you would otherwise miss.', learn: 'c-application-funnel' },
      ],
      successCriteria: [
        'A repeatable weekly monitoring cadence you actually run.',
        'You learn about target openings on day one, not day ten.',
      ],
      conceptIds: ['c-apply-early', 'c-application-funnel'],
      sourceIds: ['wiki-application-strategy'],
    },
  ],

  // ── EXAMPLES ──────────────────────────────────────────────────────────
  examples: [
    {
      id: 'ex-google-window',
      domain: D,
      title: "Google's short window",
      scenario: "Google's internship applications open mid-October with a ~2–4 week window.",
      goodMove: 'Having your kit ready, you apply within the first 48 hours of it opening.',
      badMove: 'You "wait until the weekend to do it properly" and the window closes before you apply.',
      conceptIds: ['c-apply-early'],
      sourceIds: ['wiki-application-strategy'],
    },
    {
      id: 'ex-generic-silence',
      domain: D,
      title: 'The 30-application silence',
      scenario: 'You fire off 30+ applications with one generic CV and hear nothing.',
      goodMove: 'You switch to 10 tailored applications to a target list, applied early, with a referral on the top targets.',
      badMove: 'You conclude "the market is broken" and send 30 more generic applications.',
      conceptIds: ['c-ai-screening', 'c-application-funnel'],
      sourceIds: ['wiki-job-search-system'],
    },
  ],

  // ── METRICS ───────────────────────────────────────────────────────────
  metrics: [
    {
      id: 'm-time-to-apply',
      domain: D,
      name: 'Time-to-apply',
      definition: 'Hours between a target posting going live and your application.',
      target: 'Within 24–48 hours; ideally day-one for fast-filling roles.',
      why: 'Early applications are read before the pile builds; this is the most controllable lever in the whole funnel.',
      sourceIds: ['wiki-apply-early'],
    },
    {
      id: 'm-funnel-conversion',
      domain: D,
      name: 'Funnel conversion',
      definition: 'Stage-by-stage conversion: applications → OAs → screens → finals → offers.',
      target: 'Roughly 35–40 tailored applications a month, producing 1–4 offers over a cycle.',
      why: 'Tells you whether to fix the top (volume/targeting) or a specific leaking stage.',
      sourceIds: ['wiki-application-strategy'],
    },
  ],

  // ── DECISION RULES ────────────────────────────────────────────────────
  decisionRules: [
    {
      id: 'dr-window-closing',
      domain: D,
      when: 'A target application window opens/closes within a few days.',
      match: (ctx) => (ctx.daysToDeadline ?? Infinity) <= 3,
      recommend:
        'Apply today. Tailor your master CV to the role and submit — do not keep polishing.',
      rationale:
        'Rolling admissions mean early applications are read before the pile builds, and short windows close before most people notice. A tailored-master submission now beats a perfect submission too late.',
      principleId: 'p-apply-early',
      teachesConceptId: 'c-apply-early',
      priority: 95,
    },
    {
      id: 'dr-volume-no-targeting',
      domain: D,
      when: 'The user has sent many applications but almost none came with a referral.',
      match: (ctx) => ctx.applicationsTotal >= 15 && (ctx.referralRate ?? 0) < 0.1,
      recommend:
        'Stop adding generic volume. Tailor each application to a target list and secure a referral on your top targets.',
      rationale:
        'With ~85% of companies using AI screening, generic mass-applying is often screened out. Tailored + warm survives the screen and skips the pile.',
      principleId: 'p-volume-cold-fails',
      teachesConceptId: 'c-ai-screening',
      priority: 70,
    },
    {
      id: 'dr-jobs-beginner-kit',
      domain: D,
      when: 'A beginner has not yet applied to anything.',
      match: (ctx) => ctx.experienceLevel === 'beginner' && ctx.applicationsTotal === 0,
      recommend:
        'Before the cycle opens, build your application-day kit (master CV + variants + autofill + tracker) and your monitoring stack.',
      rationale:
        'The day-one advantage only exists if you are ready before postings drop. Readiness is the cheapest way to capture the biggest timing lever.',
      principleId: 'p-apply-early',
      teachesConceptId: 'c-apply-early',
      priority: 55,
    },
  ],

  // ── LEARNING PATHS ────────────────────────────────────────────────────
  learningPaths: [
    {
      id: 'lp-jobs-beginner',
      domain: D,
      level: 'beginner',
      title: 'Get Ready to Apply',
      outcome: 'You understand why timing wins and you are ready to apply day-one.',
      modules: [
        {
          id: 'lm-timing-wins',
          title: 'Why timing wins',
          objective: 'Internalise apply-early and why cold volume fails.',
          conceptIds: ['c-apply-early', 'c-ai-screening'],
          playbookIds: [],
          completionCriteria: 'You can explain why early applications are read before the pile builds and why generic volume gets filtered.',
          exercise: 'Find one target employer\'s typical opening month and note it in your tracker.',
        },
        {
          id: 'lm-application-kit',
          title: 'Build your application-day kit',
          objective: 'Be able to apply within 24–48 hours of a posting opening.',
          conceptIds: ['c-apply-early'],
          playbookIds: ['pb-application-day', 'pb-monitoring-stack'],
          completionCriteria: 'A master CV + one variant + autofill + tracker + a monitoring stack exist.',
          exercise: 'Assemble your master CV, set up autofill, and star the relevant GitHub aggregator.',
        },
      ],
    },
    {
      id: 'lp-jobs-intermediate',
      domain: D,
      level: 'intermediate',
      title: 'Run the Application Engine',
      outcome: 'You apply early and consistently across a curated target list.',
      modules: [
        {
          id: 'lm-calendar',
          title: 'Work the posting calendar',
          objective: 'Apply day-one across a cycle without missing short windows.',
          conceptIds: ['c-apply-early'],
          playbookIds: ['pb-application-day'],
          completionCriteria: 'You have applied day-one to at least one short-window target.',
          exercise: 'Map your top 10 targets to their opening months and set alerts for each.',
        },
        {
          id: 'lm-tailoring',
          title: 'Tailor, do not mass-apply',
          objective: 'Use AI to tailor a master CV per role rather than mass-applying.',
          conceptIds: ['c-ai-screening'],
          playbookIds: [],
          completionCriteria: 'Three tailored applications submitted from one master CV.',
          exercise: 'Tailor your master CV to three specific roles and log them in the tracker.',
        },
      ],
    },
    {
      id: 'lp-jobs-advanced',
      domain: D,
      level: 'advanced',
      title: 'Optimise the Funnel',
      outcome: 'You read your funnel and fix the leaking stage instead of adding blind volume.',
      modules: [
        {
          id: 'lm-funnel',
          title: 'Diagnose and fix the funnel',
          objective: 'Use funnel conversion to find and fix your weakest stage.',
          conceptIds: ['c-application-funnel'],
          playbookIds: [],
          completionCriteria: 'You can name your weakest funnel stage and the action to fix it.',
          exercise: 'Compute your conversion at each stage and write down the one fix for the weakest.',
        },
      ],
    },
  ],
};
