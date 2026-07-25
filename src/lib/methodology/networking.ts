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
      approach: 'Technical; demonstrate domain knowledge and genuine interest in their team\'s work',
      tone: 'Technical and curious',
      tip: 'Check who posted the job listing — often the hiring manager themselves',
    },
    peers: {
      searchTitles: ['intern', 'junior developer', 'graduate engineer', 'associate'],
      capability: 'Share authentic day-to-day experience; often refer candidates they connect with',
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

  weeklyCadence: {
    connectionRequests: 3,
    coffeeChats: '1 per week',
    postsOrComments: 1,
    followUps: 'Bi-weekly check on all active contacts',
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
      'Don\'t write more than 150 words — respect their time',
    ],
    footer: 'AI drafts the structure. You add the authenticity.',
  } as const,
} as const;
