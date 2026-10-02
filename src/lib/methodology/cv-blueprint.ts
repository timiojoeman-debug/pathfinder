/**
 * TechTalk 2026 CV Blueprint methodology
 * Complete framework for CV analysis, ATS optimization, and project building
 */
export const CV_BLUEPRINT = {
  screeningStages: [
    {
      stage: 'Automated screening (ATS ranking, AI filters)',
      timing: 'Minutes to hours',
      rejectionSignal: 'within_hours',
      detail: 'Automated screening (ATS ranking plus, at high-volume employers, AI filters) can drop a CV before or alongside a human read. At smaller firms a recruiter often reads every application with the ATS flagging must-haves. Either way, match the must-have keywords in your headline, skills, and experience sections',
    },
    {
      stage: 'Recruiter 6-8 second F-pattern scan',
      timing: '2+ days',
      rejectionSignal: 'after_2_days',
      detail: 'Human scans top-left (name + title), middle-left (impact summary + skills), bottom-left (experience); quick yes/no decision',
    },
    {
      stage: 'Black hole / Role closed',
      timing: '2+ weeks',
      rejectionSignal: 'after_2_weeks',
      detail: 'Role closed, filled internally, or deprioritised — no CV action needed',
    },
  ] as const,

  /** Order for candidates with substantial relevant experience. Students and graduates use studentSectionOrder. */
  sectionOrder: [
    {
      position: 1,
      name: 'Role Title',
      rule: 'Exact match to posting, placed directly under name',
      rationale: 'ATS and recruiters scan for role match first — a mismatch here is the fastest way to be screened out',
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
      name: 'Projects',
      rule: '2-3 projects that match the role: what it does, the stack, a live link, and one result',
      rationale: 'Projects are proof of work, and they matter most where experience is thin',
    },
    {
      position: 6,
      name: 'Education',
      rule: 'Degree, institution, dates, relevant coursework if applicable',
      rationale: 'For internships, education validates eligibility but should not dominate the CV',
    },
    {
      position: 7,
      name: 'Certifications',
      rule: 'Only if relevant to the target role',
      rationale: 'Irrelevant certifications waste prime CV space and dilute your narrative',
    },
  ] as const,

  /** Order for students and graduates with thin relevant experience (TechTalk CV order). */
  studentSectionOrder: [
    {
      position: 1,
      name: 'Impact Summary',
      rule: '2-4 lines: tech stack, key achievements, value proposition, under a headline that matches the target role',
      rationale: 'The F-pattern scan hits this area first, so it has to sell you immediately',
    },
    {
      position: 2,
      name: 'Core Skills',
      rule: 'Verbatim keywords from the job posting',
      rationale: 'ATS systems scan the top third first, so skills placed here get matched early',
    },
    {
      position: 3,
      name: 'Education',
      rule: 'Degree, institution, dates, relevant coursework',
      rationale: 'With little experience yet, education is your strongest credential and belongs high on the page',
    },
    {
      position: 4,
      name: 'Projects',
      rule: '2-3 projects that match the role: what it does, the stack, a live link, and one result',
      rationale: 'Projects are your proof of work while experience is thin',
    },
    {
      position: 5,
      name: 'Experience',
      rule: '3-5 bullets per role, each with action verb + task + quantified metric where you can',
      rationale: 'Part-time, volunteering, and society roles still show transferable impact',
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
    'Length: one page is ideal for a student; up to two pages is acceptable only if every line earns its place (TechTalk CV Mastery)',
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
    name: '10-Minute Quick Tailoring Process',
    targetMinutes: 10,
    steps: [
      { step: 1, action: 'Headline: match the job title from the posting', timeMinutes: 1 },
      { step: 2, action: 'Summary: weave in the role\'s key terms and your most relevant strengths', timeMinutes: 3 },
      { step: 3, action: 'Skills: lead with the 3-5 must-have keywords from the job description', timeMinutes: 3 },
      { step: 4, action: 'Key achievements: surface the results that best match this role', timeMinutes: 3 },
    ] as const,
  },

  checks: [
    { check: 'GitHub link in header', why: 'Recruiters check GitHub for every technical candidate' },
    { check: 'Live demo URLs on projects', why: 'A deployed project proves you can ship, not just code' },
    { check: 'Real job title (prefer it to "Aspiring")', why: 'Prefer a real title such as "Computer Science Student | ..." or "Software Engineering Intern". Use "Aspiring X" only for a genuine career switch with no related experience' },
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
      diagnosis: 'Likely automated screening',
      action: 'Check the must-have keywords from the job description appear in your headline, skills, and experience before changing anything else, and ask for feedback where you can',
      methodology: 'CV Blueprint Screening Stage 1',
    },
    after_2_days: {
      diagnosis: 'Probably read by a person who passed',
      action: 'Ask for feedback where you can. If none comes, check your impact summary and skills against the posting before rewriting anything, since timing alone does not tell you what to change',
      methodology: 'CV Blueprint F-Pattern Scan',
    },
    after_2_weeks: {
      diagnosis: 'Role likely closed or filled',
      action: 'No CV action needed — the role was probably filled internally or deprioritised. Keep applying to fresh postings',
      methodology: 'CV Blueprint Screening Stage 3',
    },
    never_heard_back: {
      diagnosis: 'Application entered the black hole',
      action: 'Follow up with the recruiter or hiring manager via LinkedIn. Follow up once, then move on',
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
    { quality: 'Version-controlled with a clean git history', description: 'Meaningful commits and a maintained repo signal real engineering discipline' },
    { quality: 'Demo video available', description: 'A 60-second walkthrough lets reviewers see your work without cloning' },
  ] as const,
} as const;
