/**
 * CV — Proof, Screening & Tailoring.
 *
 * The 2026 hiring bar is no longer "qualified" — it's fit + demonstrable
 * evidence. "No proof? Filtered out." This domain teaches how a CV actually
 * gets read (AI filter → 6–8s recruiter scan) and how to pass both gates with
 * proof and quantified impact.
 *
 * Same schema and shape as domains/networking.ts. Note: this domain overlaps
 * src/lib/methodology/cv-blueprint.ts (section order, screening stages) — see
 * knowledge_health.md "Duplication / reconciliation risk".
 */
import type { DomainKnowledge } from '../types';

const D = 'cv' as const;

export const CV_KNOWLEDGE: DomainKnowledge = {
  domain: D,

  // ── PRINCIPLES ────────────────────────────────────────────────────────
  principles: [
    {
      id: 'p-show-dont-tell',
      domain: D,
      statement:
        'Show, don\'t tell — replace claims with evidence at every layer (CV, LinkedIn, portfolio, interview). No proof means filtered out.',
      rationale:
        'Recruiters read only the top 20–30% and want to justify interviewing you fast; concrete evidence makes that justification instant, whereas unbacked claims are indistinguishable from everyone else\'s.',
      evidence: [
        'The 2026 bar is fit + demonstrable evidence, not just "qualified".',
        'Recruiters read only the top ~20–30% of a CV and decide quickly.',
      ],
      sourceIds: ['wiki-proof-of-work', 'doc-cv-blueprint'],
      relatedConceptIds: ['c-proof-of-work', 'c-quantified-impact'],
    },
    {
      id: 'p-cv-linkedin-one-story',
      domain: D,
      statement:
        'A recruiter reads your CV and LinkedIn as one story, so titles, roles and dates should agree.',
      rationale:
        'One recruiter\'s account: if the CV is interesting they cross-check the LinkedIn summary, roles and past companies, and do not move forward when the two cannot be reconciled or the profile is stale.',
      evidence: [
        'Recruiter deck slides 020-021: a strong CV stalled because the LinkedIn had not been updated in years and the companies could not be verified.',
      ],
      sourceIds: ['deck-recruiters-looking-for'],
      relatedConceptIds: [],
    },
    {
      id: 'p-case-study-answer-first',
      domain: D,
      statement:
        'Open each portfolio case study with a 2-3 line answer, then your role, what you did and a number for the result.',
      rationale:
        'Per the portfolio deck, hiring managers want to know whether you can identify a problem, make decisions and deliver something that worked; a list of deliverables does not answer that.',
      evidence: [
        'Portfolio deck slides 010-014: summary first, then STAR with your own role (not the team\'s); a number is stronger than description.',
      ],
      sourceIds: ['deck-portfolio'],
      relatedConceptIds: [],
    },
    {
      id: 'p-cv-screening-gates',
      domain: D,
      statement:
        'A CV must pass two gates before any human seriously considers it — an AI/ATS keyword filter, then a 6–8 second recruiter scan.',
      rationale:
        'Software surfaces only the top ~20–30% by keyword and relevance; the human then F-pattern-scans the top of page one. Automated screening (ATS ranking plus, at high-volume employers, AI filters) can drop a CV before or alongside a human read; at smaller firms a recruiter often reads every application with the ATS flagging must-haves. Either way, a CV that survives gets seconds, not minutes.',
      evidence: [
        'AI/ATS filter surfaces only the top ~20–30%; failure → the CV can be dropped before or alongside a human read.',
        'The recruiter scan is ~6–8 seconds, F-pattern over the top half of page one.',
      ],
      sourceIds: ['wiki-ats-optimization', 'doc-cv-blueprint'],
      relatedConceptIds: ['c-ats-optimization'],
    },
    {
      id: 'p-tailor-master',
      domain: D,
      statement:
        'Keep one strong master CV and tailor it per role — never rewrite from scratch, and never ship generic AI phrasing.',
      rationale:
        'Mirroring each posting\'s keywords is what clears the ATS gate, but rewriting wholesale wastes time and introduces errors, while generic AI phrasing is penalised by both ATS and recruiters.',
      evidence: [
        'Tailoring (not rewriting) lets a master CV mirror each job description\'s keywords without keyword-stuffing.',
        'Both ATS and recruiters penalise unedited, generic AI phrasing.',
      ],
      sourceIds: ['wiki-ats-optimization', 'wiki-job-search-system'],
      relatedConceptIds: ['c-ats-optimization', 'c-proof-of-work'],
    },
  ],

  // ── FRAMEWORKS ────────────────────────────────────────────────────────
  frameworks: [
    {
      id: 'f-cv-screening-funnel',
      domain: D,
      name: 'The CV Screening Funnel',
      purpose:
        'Shows the three gates a CV passes through, so you optimise for the one that actually rejects you.',
      appliesWhen: 'Diagnosing why a CV is getting no responses.',
      steps: [
        { label: 'AI / ATS filter', detail: 'Parses keywords, tools, location, JD relevance; surfaces only the top ~20–30%. Fail → the CV can be dropped before or alongside a human read; match the must-have keywords.' },
        { label: 'Recruiter scan', detail: '~6–8 seconds, F-pattern over the top half of page one. Quick yes/no.' },
        { label: 'The black hole', detail: 'Passed AI but not picked — silence. Often the role was filled internally; the higher-yield fix is a referral that skips the gate.' },
      ],
      sourceIds: ['wiki-ats-optimization'],
    },
    {
      id: 'f-cv-blueprint',
      domain: D,
      name: 'The CV Section Order',
      purpose:
        'Orders a one-page CV so the highest-signal content lands where the ATS and the F-pattern scan look first.',
      appliesWhen: 'Structuring or restructuring a CV.',
      steps: [
        { label: '1. Role Title', detail: 'Exact match to the posting, directly under your name — a mismatch here is the fastest way to be screened out.' },
        { label: '2. Impact Summary', detail: '2–4 lines: tech stack, key achievements, value proposition — the F-pattern hits this first.' },
        { label: '3. Core Skills', detail: 'Verbatim keywords from the posting, placed in the top third for the ATS.' },
        { label: '4. Experience', detail: '3–5 bullets/role, each action verb + task + quantified metric (≥2 metrics per role).' },
        { label: '5. Education', detail: 'Degree, institution, dates; for internships it validates eligibility but should not dominate.' },
        { label: '6. Certifications', detail: 'Only if relevant — irrelevant ones dilute the narrative.' },
      ],
      sourceIds: ['doc-cv-blueprint'],
    },
    {
      id: 'f-proof-layers',
      domain: D,
      name: 'Proof at Every Layer',
      purpose:
        'Apply "show, don\'t tell" consistently across every surface a recruiter sees.',
      appliesWhen: 'Auditing your whole application package, not just the CV.',
      steps: [
        { label: 'CV', detail: 'Metrics, not duties — action verb + task + result.' },
        { label: 'LinkedIn', detail: 'Measurable impact + featured work.' },
        { label: 'Portfolio', detail: 'Receipts: live demo links and your real numbers.' },
        { label: 'Interview', detail: 'Thought process + quantified STARL results.' },
        { label: 'AI fluency', detail: 'A workflow you built and can describe end-to-end.' },
      ],
      sourceIds: ['wiki-proof-of-work'],
    },
  ],

  // ── CONCEPTS ──────────────────────────────────────────────────────────
  concepts: [
    {
      id: 'c-proof-of-work',
      domain: D,
      term: 'Proof of Work',
      definition:
        'The 2026 hiring bar: fit + demonstrable evidence. Every claim is replaced with a receipt — "show, don\'t tell."',
      purpose:
        'Makes a recruiter\'s yes instant by giving them something concrete to point at, instead of asking them to trust an unbacked claim.',
      prerequisiteIds: [],
      examples: [
        'A GitHub link in the CV header and "Live Demo" links on each project.',
        'A metric on education ("92% average") when work experience is thin.',
        'Shipping a real project with real users as the highest-value proof.',
      ],
      antiPatterns: [
        'Listing responsibilities ("responsible for X") instead of results.',
        'Claiming skills with nothing a recruiter can click or verify.',
      ],
      relatedConceptIds: ['c-quantified-impact', 'c-ats-optimization'],
      principleIds: ['p-show-dont-tell'],
      sourceIds: ['wiki-proof-of-work'],
    },
    {
      id: 'c-ats-optimization',
      domain: D,
      term: 'ATS & AI CV Screening',
      definition:
        'How a CV actually gets read in 2026 — an AI/ATS keyword filter surfacing the top ~20–30%, then a 6–8s recruiter F-pattern scan — and how to survive each gate.',
      purpose:
        'Tells you exactly what to optimise (keyword mirroring, one-page ATS-friendly format, top-loaded impact) so your CV is seen by a human at all.',
      prerequisiteIds: [],
      examples: [
        'Mirroring the posting\'s exact skills/tools/role terms without keyword-stuffing.',
        'A one-page CV with no tables, columns, or graphics and standard headings.',
        'Front-loading quantified impact into the top half of page one.',
      ],
      antiPatterns: [
        'Tables, columns, and graphics that ATS parsers mangle.',
        'Keyword-stuffing, which recruiters spot and penalise.',
        'Burying achievements below the fold where the 6–8s scan never reaches.',
      ],
      relatedConceptIds: ['c-proof-of-work', 'c-quantified-impact'],
      principleIds: ['p-cv-screening-gates', 'p-tailor-master'],
      sourceIds: ['wiki-ats-optimization'],
    },
    {
      id: 'c-quantified-impact',
      domain: D,
      term: 'Quantified Impact',
      definition:
        'Writing experience as achievements, not responsibilities: every bullet is action verb + task + a quantified result, with at least two metrics per role.',
      purpose:
        'Turns vague duty statements into evidence a recruiter can weigh in seconds — the bullet-level expression of proof of work.',
      prerequisiteIds: ['c-proof-of-work'],
      examples: [
        '"Cut build time 40% by parallelising the CI pipeline" beats "responsible for CI."',
        'Adding a number to a student project: "served 200 real users; reduced API latency 30%."',
      ],
      antiPatterns: [
        'Bullets that list tasks with no outcome ("worked on the frontend").',
        'Adjective-led claims ("highly skilled in…") with no measurable result.',
      ],
      relatedConceptIds: ['c-proof-of-work', 'c-ats-optimization'],
      principleIds: ['p-show-dont-tell'],
      sourceIds: ['doc-cv-blueprint', 'wiki-proof-of-work'],
    },
  ],

  // ── PLAYBOOKS ─────────────────────────────────────────────────────────
  playbooks: [
    {
      id: 'pb-make-cv-pass',
      domain: D,
      name: 'Make Your CV Pass Both Gates',
      goal: 'Get a tailored CV through the AI filter and the 6–8s recruiter scan for a specific role.',
      whenToUse: 'Before applying to a target role with your master CV.',
      steps: [
        { action: 'Set your Role Title to the exact posting title, directly under your name.', why: 'A role-match mismatch is an instant ATS/recruiter rejection.', learn: 'c-ats-optimization' },
        { action: 'Mirror the posting\'s skills/tools/role terms in Core Skills (top third), without stuffing.', why: 'The ATS scans the top third first and matches on these keywords.', learn: 'c-ats-optimization' },
        { action: 'Rewrite each experience bullet as action verb + task + quantified result (≥2 metrics/role).', why: 'Recruiters spend the most time on Experience; numbers prove impact in seconds.', learn: 'c-quantified-impact' },
        { action: 'Keep it one page, ATS-friendly (no tables/columns/graphics), top-loading impact.', why: 'Parsers mangle complex layouts; the F-pattern only reaches the top half.', learn: 'c-ats-optimization' },
        { action: 'Tailor your master CV per role — do not rewrite from scratch or ship generic AI text.', why: 'Tailoring clears the gate; generic AI phrasing is penalised by both filters.', learn: 'c-proof-of-work' },
      ],
      successCriteria: [
        'Role title and top-third keywords match the posting.',
        'Every role has ≥2 quantified bullets and the CV fits one ATS-friendly page.',
      ],
      conceptIds: ['c-ats-optimization', 'c-quantified-impact', 'c-proof-of-work'],
      sourceIds: ['wiki-ats-optimization', 'doc-cv-blueprint'],
    },
    {
      id: 'pb-build-proof',
      domain: D,
      name: 'Build Proof With Thin Experience',
      goal: 'Give a student CV concrete, clickable evidence when work history is light.',
      whenToUse: 'You are early-career with few or no internships.',
      steps: [
        { action: 'Add a GitHub link to the CV header.', why: 'A clickable receipt lets a recruiter verify you build, not just claim.', learn: 'c-proof-of-work' },
        { action: 'Put a metric on education (e.g. "92% average") and relevant coursework.', why: 'Quantified academics substitute for missing work metrics.', learn: 'c-quantified-impact' },
        { action: 'Add a Projects section with "Live Demo" links and your real numbers.', why: 'Live, numbered projects are the highest-value proof for students.', learn: 'c-proof-of-work' },
        { action: 'Ship one real project with real users and describe its impact.', why: 'Real usage is the strongest possible signal of fit.', learn: 'c-proof-of-work' },
      ],
      successCriteria: [
        'At least one clickable proof (GitHub or live demo) above the fold.',
        'Every project and the education line carries a real number.',
      ],
      conceptIds: ['c-proof-of-work', 'c-quantified-impact'],
      sourceIds: ['wiki-proof-of-work'],
    },
  ],

  // ── EXAMPLES ──────────────────────────────────────────────────────────
  examples: [
    {
      id: 'ex-bullet-rewrite',
      domain: D,
      title: 'Duty → achievement',
      scenario: 'Your CV says "Responsible for maintaining the team\'s CI pipeline."',
      goodMove: '"Cut CI build time 40% by parallelising test stages, unblocking ~15 daily deploys."',
      badMove: 'Leaving the duty statement as-is, with no verb, task, or number.',
      conceptIds: ['c-quantified-impact', 'c-proof-of-work'],
      sourceIds: ['doc-cv-blueprint'],
    },
    {
      id: 'ex-student-proof',
      domain: D,
      title: 'Thin CV, real proof',
      scenario: 'A first-year with no internships needs to look hireable.',
      goodMove: 'GitHub in the header, "92% average" on education, a Projects section with live demos and real user numbers.',
      badMove: 'A skills list of claimed technologies with nothing a recruiter can click or verify.',
      conceptIds: ['c-proof-of-work'],
      sourceIds: ['wiki-proof-of-work'],
    },
  ],

  // ── METRICS ───────────────────────────────────────────────────────────
  metrics: [
    {
      id: 'm-quantified-bullets',
      domain: D,
      name: 'Quantified-bullet ratio',
      definition: 'Share of experience bullets that contain a concrete number.',
      target: 'At least 2 quantified bullets per role.',
      why: 'Quantified bullets are what survive the 6–8s scan; this ratio is the most direct measure of proof on the page.',
      sourceIds: ['doc-cv-blueprint'],
    },
    {
      id: 'm-keyword-match',
      domain: D,
      name: 'Keyword match',
      definition: 'How closely your top-third keywords mirror the target posting\'s skills/tools/role terms.',
      target: 'Role title and core skills mirror the posting (without stuffing).',
      why: 'This is what the ATS filter scores first; a low match means a human never sees the CV.',
      sourceIds: ['wiki-ats-optimization'],
    },
  ],

  // ── DECISION RULES ────────────────────────────────────────────────────
  decisionRules: [
    {
      id: 'dr-cv-no-proof',
      domain: D,
      when: 'The CV/profile carries no demonstrable proof.',
      match: (ctx) => ctx.hasProof === false,
      recommend:
        'Add clickable proof before applying: a GitHub link in the header, a metric on education, and a Projects section with live-demo links.',
      rationale:
        'The 2026 bar is fit + evidence — "no proof, filtered out." A recruiter reading only the top 20–30% needs something concrete to point at to justify interviewing you.',
      principleId: 'p-show-dont-tell',
      teachesConceptId: 'c-proof-of-work',
      priority: 75,
    },
    {
      id: 'dr-cv-weak-score',
      domain: D,
      when: 'The CV scores poorly in analysis.',
      match: (ctx) => ctx.cvScore !== undefined && ctx.cvScore < 60,
      recommend:
        'Tailor the CV to pass both gates: exact role-title match, posting keywords in the top third, and ≥2 quantified bullets per role on one ATS-friendly page.',
      rationale:
        'A low-scoring CV is failing the AI filter or the 6–8s scan. Optimising role match, top-third keywords, and quantified impact targets exactly the gates that reject it.',
      principleId: 'p-cv-screening-gates',
      teachesConceptId: 'c-ats-optimization',
      priority: 70,
    },
    {
      id: 'dr-cv-beginner-quantify',
      domain: D,
      when: 'A beginner has not yet analysed a CV.',
      match: (ctx) => ctx.experienceLevel === 'beginner' && ctx.cvScore === undefined,
      recommend:
        'Build a one-page master CV with quantified bullets — every experience line as action verb + task + result, at least two metrics per role.',
      rationale:
        'Starting from quantified impact bakes "show, don\'t tell" in from the first draft, so the CV clears the scan instead of needing a rescue later.',
      principleId: 'p-show-dont-tell',
      teachesConceptId: 'c-quantified-impact',
      priority: 55,
    },
  ],

  // ── LEARNING PATHS ────────────────────────────────────────────────────
  learningPaths: [
    {
      id: 'lp-cv-beginner',
      domain: D,
      level: 'beginner',
      title: 'Make Your CV Provable',
      outcome: 'Your CV shows evidence, not claims, and reads as hireable.',
      modules: [
        {
          id: 'lm-proof',
          title: 'Show, don\'t tell',
          objective: 'Internalise proof of work and quantified impact.',
          conceptIds: ['c-proof-of-work', 'c-quantified-impact'],
          playbookIds: ['pb-build-proof'],
          completionCriteria: 'Every project and education line carries a real number, with at least one clickable proof.',
          exercise: 'Rewrite three CV bullets as action verb + task + quantified result.',
        },
      ],
    },
    {
      id: 'lp-cv-intermediate',
      domain: D,
      level: 'intermediate',
      title: 'Pass the Screening Gates',
      outcome: 'Your tailored CV clears the ATS filter and the recruiter scan.',
      modules: [
        {
          id: 'lm-ats',
          title: 'Beat the funnel',
          objective: 'Optimise role match, keywords, and format for both gates.',
          conceptIds: ['c-ats-optimization'],
          playbookIds: ['pb-make-cv-pass'],
          completionCriteria: 'A one-page, ATS-friendly CV whose role title and top-third keywords mirror a target posting.',
          exercise: 'Tailor your master CV to one posting: match the title and mirror its keywords.',
        },
      ],
    },
    {
      id: 'lp-cv-advanced',
      domain: D,
      level: 'advanced',
      title: 'Proof at Every Layer',
      outcome: 'CV, LinkedIn, portfolio, and interview all tell the same evidenced story.',
      modules: [
        {
          id: 'lm-layers',
          title: 'Make the whole package prove it',
          objective: 'Apply "show, don\'t tell" across every recruiter-facing surface.',
          conceptIds: ['c-proof-of-work'],
          playbookIds: [],
          completionCriteria: 'LinkedIn featured work, a live portfolio, and STARL-ready interview stories all carry metrics.',
          exercise: 'Audit each layer (CV/LinkedIn/portfolio) and add one piece of proof to each.',
        },
      ],
    },
  ],
};
