/**
 * TechTalk 2026 CV Blueprint methodology
 * Complete framework for CV analysis, ATS optimization, and project building
 */
export const CV_BLUEPRINT = {
  screeningStages: [
    {
      stage: 'ATS auto-filter',
      timing: 'Minutes',
      rejectionSignal: 'within_hours',
      detail: 'Automated keyword matching; instant rejection if critical keywords missing from headline, skills, or experience sections',
    },
    {
      stage: 'Recruiter 6-8 second F-pattern scan',
      timing: '1-2 days',
      rejectionSignal: 'within_1_2_days',
      detail: 'Human scans top-left (name + title), middle-left (impact summary + skills), bottom-left (experience); quick yes/no decision',
    },
    {
      stage: 'Black hole / Role closed',
      timing: '2+ weeks',
      rejectionSignal: 'after_2_weeks',
      detail: 'Role closed, filled internally, or deprioritised — no CV action needed',
    },
  ] as const,

  sectionOrder: [
    {
      position: 1,
      name: 'Role Title',
      rule: 'Exact match to posting, placed directly under name',
      rationale: 'ATS and recruiters scan for role match first — a mismatch here is an instant rejection',
    },
    {
      position: 2,
      name: 'Impact Summary',
      rule: '2-4 lines: tech stack, key achievements, value proposition',
      rationale: 'The F-pattern scan hits this area in the first 2 seconds — it must sell you immediately',
    },
    {
      position: 3,
      name: 'Core Skills',
      rule: 'Verbatim keywords from the job posting',
      rationale: 'ATS systems scan the top third first — skills placed here get matched before the system loses interest',
    },
    {
      position: 4,
      name: 'Experience',
      rule: '3-5 bullets per role, each with action verb + task + quantified metric, minimum 2 metrics per role',
      rationale: 'Recruiters spend the most time here — every bullet must prove impact, not just describe tasks',
    },
    {
      position: 5,
      name: 'Education',
      rule: 'Degree, institution, dates, relevant coursework if applicable',
      rationale: 'For internships, education validates eligibility but should not dominate the CV',
    },
    {
      position: 6,
      name: 'Certifications',
      rule: 'Only if relevant to the target role',
      rationale: 'Irrelevant certifications waste prime CV space and dilute your narrative',
    },
  ] as const,

  formattingRules: [
    'Single-column layout — multi-column breaks ATS parsing',
    'PDF format — preserves formatting across all systems',
    'UK spelling throughout (e.g. organisation not organization, colour not color) — AI tools default to US spelling, always check',
    'Standard headings (e.g. "Work Experience" not "What I\'ve Done", "Education" not "My Learning Journey")',
    'No graphics, tables, icons, or images — ATS cannot parse visual elements',
    'Consistent date formatting (MMM YYYY – MMM YYYY)',
    'No headers/footers with critical info — ATS often skips these areas',
  ] as const,

  atsChecklist: [
    { item: 'PDF format', category: 'format' },
    { item: 'Keywords from job posting in headline and skills section', category: 'keywords' },
    { item: 'Single-column layout', category: 'format' },
    { item: 'UK spelling throughout', category: 'language' },
    { item: 'Standard section headings', category: 'format' },
    { item: 'Zero typos', category: 'language' },
    { item: 'Role title matches job posting exactly', category: 'keywords' },
    { item: 'No graphics, tables, or icons', category: 'format' },
  ] as const,

  tailoringProcess: {
    name: '15-Minute Quick Tailoring Process',
    targetMinutes: 15,
    steps: [
      { step: 1, action: 'Extract 3-5 critical keywords from the job description', timeMinutes: 3 },
      { step: 2, action: 'Update headline to match the exact job title from the posting', timeMinutes: 1 },
      { step: 3, action: 'Insert keywords naturally into impact summary and skills section', timeMinutes: 3 },
      { step: 4, action: 'Swap 1-2 experience bullets for the most relevant results matching this role', timeMinutes: 5 },
      { step: 5, action: 'Verify first-page layout: F-pattern scan, UK spelling, format check', timeMinutes: 3 },
    ] as const,
  },

  checks: [
    { check: 'GitHub link in header', why: 'Recruiters check GitHub for every technical candidate' },
    { check: 'Live demo URLs on projects', why: 'A deployed project proves you can ship, not just code' },
    { check: 'Real job title (never "Aspiring")', why: '"Aspiring Developer" tells recruiters you are not one yet' },
    { check: 'Metrics in every bullet (min 2 per role)', why: 'Numbers are the only universal proof of impact' },
    { check: 'UK spelling throughout', why: 'AI tools default to US — unchecked AI output signals laziness' },
    { check: 'Impact summary in top third (F-pattern)', why: 'Recruiters spend 6-8 seconds scanning; top-third content decides pass/fail' },
  ] as const,

  bulletFormula: {
    structure: 'Action verb + task + quantified metric',
    weakExamples: [
      { text: 'Built a dashboard', problem: 'No metric, no context, no impact' },
      { text: 'Worked on the backend', problem: 'Vague verb, no specifics' },
      { text: 'Responsible for testing', problem: '"Responsible for" is passive, no outcome' },
    ],
    strongExamples: [
      { text: 'Built a real-time analytics dashboard serving 200+ daily users, reducing report generation time by 40%', why: 'Specific tech, user count, measurable improvement' },
      { text: 'Designed and implemented RESTful API handling 10,000+ daily requests with 99.9% uptime', why: 'Scale + reliability metric' },
      { text: 'Migrated legacy codebase to TypeScript, eliminating 85% of runtime type errors across 50+ components', why: 'Before/after comparison with scope' },
    ],
  } as const,

  vagueTerms: {
    flagWords: [
      { term: 'assisted with', rewrite: 'Specify what YOU did: "Developed...", "Implemented...", "Designed..."' },
      { term: 'worked on', rewrite: 'Replace with specific action: "Built...", "Architected...", "Optimised..."' },
      { term: 'responsible for', rewrite: 'Change to active: "Led...", "Managed...", "Delivered..."' },
      { term: 'involved in', rewrite: 'State your specific contribution: "Authored...", "Deployed...", "Tested..."' },
      { term: 'various', rewrite: 'Be specific: name the actual technologies, projects, or tasks' },
      { term: 'numerous', rewrite: 'Use a number: "12 components", "5 microservices", "200+ users"' },
      { term: 'helped', rewrite: 'State what you delivered: "Reduced...", "Increased...", "Automated..."' },
      { term: 'utilized', rewrite: 'Simpler: "Used React to..." or better, lead with the outcome' },
    ],
  } as const,

  fPattern: {
    description: 'Recruiter 6-8 second F-pattern scan',
    zones: [
      { zone: 'Top-left', content: 'Name, role title, contact info', scanTime: '0-2 seconds' },
      { zone: 'Top-right', content: 'GitHub link, portfolio URL', scanTime: '2-3 seconds' },
      { zone: 'Middle-left', content: 'Impact summary, core skills', scanTime: '3-5 seconds' },
      { zone: 'Bottom-left', content: 'Experience bullets (first 2-3)', scanTime: '5-8 seconds' },
    ],
    totalTime: '6-8 seconds',
    rule: 'Strongest content in top-left, visible in the first scan pass',
  } as const,

  rejectionTiming: {
    within_hours: {
      diagnosis: 'ATS auto-filter rejection',
      action: 'Review keyword alignment — critical keywords from the job description are missing from your headline, skills, or experience sections',
      methodology: 'CV Blueprint Screening Stage 1',
    },
    within_1_2_days: {
      diagnosis: 'Recruiter reviewed and passed',
      action: 'Improve impact summary — your CV passed ATS but the recruiter did not see enough value in the 6-8 second scan',
      methodology: 'CV Blueprint F-Pattern Scan',
    },
    after_2_weeks: {
      diagnosis: 'Role likely closed or filled',
      action: 'No CV action needed — the role was probably filled internally or deprioritised. Keep applying to fresh postings',
      methodology: 'CV Blueprint Screening Stage 3',
    },
    never_heard_back: {
      diagnosis: 'Application entered the black hole',
      action: 'Follow up with the recruiter or hiring manager via LinkedIn. If no response after 2 follow-ups, move on',
      methodology: 'Networking Strategy',
    },
  } as const,

  standoutProjectQualities: [
    { quality: 'Solves a real problem', description: 'Not a tutorial clone — addresses an actual need someone would use' },
    { quality: 'Uses modern stack', description: 'Technologies that appear in job postings for your target role' },
    { quality: 'Deployed with live URL', description: 'A running app proves you can ship to production, not just push to GitHub' },
    { quality: 'Comprehensive README', description: 'Screenshots, setup guide, architecture decisions, tech stack rationale' },
    { quality: 'Clean code with tests', description: 'Unit and integration tests show engineering maturity' },
    { quality: 'Technical decision-making documented', description: '"Why PostgreSQL over MongoDB?" — shows you think, not just code' },
    { quality: 'Demo video available', description: 'A 60-second walkthrough lets reviewers see your work without cloning' },
  ] as const,
} as const;
