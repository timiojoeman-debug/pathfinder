/**
 * TechTalk Networking Strategy
 * Hiring pyramid, target groups, outreach variants, cadence, do's and don'ts
 */
export const NETWORKING_STRATEGY = {
  hiringPyramid: [
    { tier: 1, source: 'Internal candidates', description: 'Existing employees moving to new roles' },
    { tier: 2, source: 'Hiring manager\'s personal network', description: 'People the manager already knows and trusts' },
    { tier: 3, source: 'Internal referrals', description: 'Recommendations from current employees — candidates with referrals have ~4x higher interview chances' },
    { tier: 4, source: 'Cold applications', description: 'The traditional apply-and-hope approach — lowest conversion rate' },
  ] as const,

  stats: {
    hiddenJobMarket: '70–80% of roles are filled through the hidden job market — never publicly advertised',
    referralAdvantage: 'Candidates with a referral have roughly 4x higher interview chances',
  } as const,

  targetGroups: {
    recruiters: {
      searchTitles: ['talent', 'talent acquisition', 'talent partner', 'recruiter', 'HR'],
      capability: 'Gatekeepers to roles; can fast-track applications past ATS',
      approach: 'Professional, concise; respect their time, focus on role fit and availability',
      tone: 'Professional and concise',
      tip: 'Check if someone posted about the specific role — they are the most responsive',
    },
    hiringManagers: {
      searchTitles: ['chief', 'head of', 'engineering manager', 'tech lead', 'VP engineering', 'CTO'],
      capability: 'Direct decision-makers who know exactly what the team needs',
      approach: 'Technical; demonstrate domain knowledge and genuine interest in their team\'s work. Hiring managers decide on fit, so do not ask them for a referral: peers and alumni give referrals',
      tone: 'Technical and curious',
      tip: 'Check who posted the job listing — often the hiring manager themselves',
    },
    peers: {
      searchTitles: ['intern', 'junior developer', 'graduate engineer', 'associate'],
      capability: 'Share authentic day-to-day experience; peers and alumni are who give referrals once they have connected with you',
      approach: 'Warm, casual; ask about their journey, emphasise shared experiences',
      tone: 'Warm and casual',
      tip: 'Check university alumni networks — shared education is the strongest warm connection',
    },
  } as const,

  outreachVariants: {
    sharedConnection: {
      name: 'Shared Connection',
      when: 'Shared university, city, background, or mutual connection exists',
      leadWith: 'The shared connection — this is the strongest opener',
      selectionCriteria: 'AI must first assess what shared attributes ACTUALLY exist. Never fabricate.',
    },
    contentHook: {
      name: 'Content Hook',
      when: 'No personal connection but the contact has posted content (article, LinkedIn post, talk)',
      leadWith: 'Reference their specific post or article — shows you did research',
      selectionCriteria: 'Only use if student provides actual content to reference. Never invent posts.',
    },
    curiosityHumility: {
      name: 'Curiosity & Humility',
      when: 'Fallback when no shared connection and no content hook available',
      leadWith: 'Genuine questions and honest statement that you have no strong connection',
      selectionCriteria: 'Default when other variants don\'t apply. Honesty > forced connection.',
    },
  } as const,

  startupOutreach: {
    target: 'CTO, VP Engineering, or engineering lead at startups under ~100 people',
    companySize: 'Under ~100 employees (the Direct Access method targets sub-100-person firms)',
    frame: 'Willing to do useful work — not expecting pay, motivated by learning alongside experienced engineers',
    offers: ['Bug fixes', 'Test writing', 'Internal tools', 'Documentation', 'Feature work'],
    ask: '15 minutes to show what they have built',
    criticalRule: 'The one company-specific detail is NON-NEGOTIABLE. A generic email to 50 startups gets zero replies. Spend 10 minutes on their website, blog, or GitHub.',
    refusalCondition: 'If company-specific detail is empty or generic, REFUSE to generate and explain why',
  } as const,

  /**
   * Who to ask for what (TechTalk, above/below the line of decision-making power).
   * Nobody in this matrix is asked for a job. Peers and alumni can refer you once
   * they know you; recruiters give insight; hiring managers decide on fit.
   */
  whoToAsk: [
    { who: 'Peers and alumni', line: 'below', referral: true, insight: true, style: 'Trust-driven', ask: 'Their story and advice first. A referral can follow once they know you.' },
    { who: 'Recruiters', line: 'above', referral: false, insight: true, style: 'Fit-driven', ask: 'Insight on the role and the process. Never a referral.' },
    { who: 'Hiring managers', line: 'above', referral: false, insight: false, style: 'Fit-driven', ask: 'They decide on fit. Show fit; do not ask for a referral or a job.' },
  ] as const,

  /** Anatomy of a LinkedIn connection note. Both must fit the 300-character limit. */
  connectionRequests: {
    charLimit: 300,
    peer: {
      parts: ['A personalised intro that shows you did your research', 'What you would like to learn from them, so it is clear what they would bring'],
      note: 'Short and warm. Cite one real thing from their profile or a real shared link.',
    },
    recruiter: {
      parts: [
        'Purpose: you saw they are hiring for a specific role at their company',
        'Pulled from the job description: one requirement you genuinely meet',
        'A personalised intro: a portfolio or project link they can open',
        'A light close, such as asking what they think',
      ],
      note: 'Fit-driven. Name the role and your matching proof. Do not ask for a referral.',
    },
  } as const,

  /** Nine things worth noticing on a profile before you personalise a message. */
  personalisationSignals: [
    { signal: 'Recent move', look: 'New role, promotion, team change' },
    { signal: 'Education', look: 'University, bootcamp, certification' },
    { signal: 'Headline keywords', look: 'What they do day to day' },
    { signal: 'Current company or team', look: 'Hiring, growing, new function' },
    { signal: 'Location', look: 'Studied abroad, relocated, same background' },
    { signal: 'Recent activity', look: 'Posts, comments, reports' },
    { signal: 'Career transitions', look: 'Industry switch, role pivot, seniority jump' },
    { signal: 'Featured section', look: 'Talks, posts, projects, videos' },
    { signal: 'Shared connection', look: 'Mutuals, past teams or companies' },
  ] as const,

  /** Guidance only: how a transactional message differs from a relationship one. */
  transactionalVsRelationship: [
    { row: 'The message says', transactional: '"Can you refer me?"', relationship: '"Can I learn from you?"' },
    { row: 'Focus', transactional: 'Getting something', relationship: 'Building a connection' },
    { row: 'Tone', transactional: 'Cold, rushed, generic', relationship: 'Warm, personal, intentional' },
    { row: 'Outcome', transactional: 'Ignored or declined', relationship: 'A conversation, trust, then a referral' },
  ] as const,

  weeklyCadence: {
    connectionRequests: 3,
    coffeeChats: '1 per week',
    postsOrComments: 1,
    followUps: 'Bi-weekly check on all active contacts',
    /** A second, clearly labelled option from the 10-in-30 sprint. The baseline above stays the default. */
    sprint: '30-day sprint: ~10 recruiter + ~10 peer/hiring-manager messages and 2–3 coffee chats a week',
  } as const,

  contactDiscovery: {
    step1: {
      name: 'Find Recruiters',
      searchQueries: ['"talent acquisition" + [company]', '"recruiter" + [company]'],
      tip: 'Check who posted about the specific role — they are the most responsive contact',
    },
    step2: {
      name: 'Find Hiring Manager',
      searchQueries: ['"engineering manager" + [company]', '"head of engineering" + [company]'],
      tip: 'Check who posted the job listing — often the hiring manager themselves',
    },
    step3: {
      name: 'Find Peers',
      searchQueries: ['"intern" + [company]', '"junior developer" + [company]', '"[your university]" + [company] + software engineer'],
      tip: 'Alumni are the highest-leverage peer search — shared education halves the "why me?" barrier. Search your university name + the company and filter to engineers 1-4 years in.',
    },
  } as const,

  dosAndDonts: {
    dos: [
      'Personalise every message with genuine context about the recipient',
      'Use AI to draft the structure, then make it sound natural and authentic',
      'Add one personal detail that only YOU would know (a project, an insight, a shared experience)',
      'Follow up within the cadence — most people are busy, not uninterested',
      'Research the company before reaching out — mention something specific',
    ],
    donts: [
      'Don\'t copy-paste AI output without editing — recipients can tell',
      'Don\'t use vague generic openers like "I\'d love to connect" or "I\'m reaching out because"',
      'Don\'t spam identical messages to multiple people at the same company',
      'Don\'t ask for a job in your first message — ask for advice or insight first',
      'Keep a LinkedIn connection note under 300 characters (the platform limit)',
      'Keep a first message or email short, roughly 5-6 sentences, to respect their time',
    ],
    footer: 'AI drafts the structure. You add the authenticity.',
  } as const,
} as const;
