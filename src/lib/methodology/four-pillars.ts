/**
 * TechTalk Four Pillars of Job Search
 * Structure, time allocation, review, targets, quality warnings
 */
export const FOUR_PILLARS = {
  pillars: [
    {
      name: 'Clarity',
      meaning: 'Career direction and target definition',
      whyItMatters: 'Without clarity, every application is a guess. A clear direction lets you judge every role, project, and networking message with one question: "Does this move me closer?"',
      timeAllocation: '10%',
    },
    {
      name: 'Positioning',
      meaning: 'CV, LinkedIn, GitHub, portfolio — how you present yourself',
      whyItMatters: 'Your positioning materials are your marketing. They must tell a consistent story that matches your direction.',
      timeAllocation: 'Max 30% — positioning is important but diminishing returns set in. Don\'t polish your CV for 3 weeks.',
    },
    {
      name: 'Networking',
      meaning: 'Connections and referrals that open doors — plus the projects that make you referable',
      whyItMatters: '70–80% of roles are filled through the hidden job market. Networking opens the doors cold applications never reach; building projects fills the skill gaps that earn a referral.',
      timeAllocation: 'Min 35% — this is where results come from',
    },
    {
      name: 'Consistency',
      meaning: 'Regular, tailored applications and disciplined follow-through',
      whyItMatters: 'Consistency beats intensity. A steady weekly cadence of tailored applications outperforms 30 generic applications fired off in a weekend.',
      timeAllocation: 'Min 25% — steady cadence is non-negotiable',
    },
  ] as const,

  // Interview preparation is a SEPARATE, parallel workstream in the TechTalk
  // Four Pillars framework — the webinar is explicit that it is not one of the
  // four pillars. It runs alongside them once interviews start landing.
  interviewPrep: {
    note: 'A separate, parallel workstream — not one of the four pillars. Prepare for interviews in parallel once they start landing.',
  } as const,

  fridayReview: {
    name: 'Lightweight Friday Review',
    description: 'Every Friday, 30-second self-check across the four pillars. No AI analysis — just visibility.',
    questions: [
      { pillar: 'Clarity', question: 'Is my direction still clear, or do I need to refine it?' },
      { pillar: 'Positioning', question: 'Did I improve my CV, LinkedIn, or portfolio this week?' },
      { pillar: 'Networking', question: 'Did I send outreach or have a coffee chat this week?' },
      { pillar: 'Consistency', question: 'Did I submit 5-8 tailored applications this week?' },
    ],
  } as const,

  weeklyTargets: {
    tailoredApplications: '5-8 per week (quality over quantity)',
    connectionRequests: '3 new connections per week',
    coffeeChats: '1 per week',
    posts: '1 LinkedIn post or comment per week',
    sprintNetworking: '30-day sprint option: ~10 recruiter + ~10 peer/hiring-manager messages and 2–3 coffee chats a week',
  } as const,

  qualityWarnings: [
    {
      condition: 'applicationsThisWeek > 10',
      threshold: 10,
      type: 'too_many',
      message: 'You\'ve submitted {count} applications this week. Are they all genuinely tailored? Past ~10 a week, quality usually slips. The CV Blueprint\'s 10-minute tailoring process should be applied to every single application.',
    },
    {
      condition: 'applicationsThisWeek === 0 && dayOfWeek >= 4',
      threshold: 0,
      type: 'none_by_thursday',
      message: 'No applications yet this week and it\'s already {day}. Aim for 5-8 quality submissions before Friday. Even one well-tailored application is better than zero.',
    },
    {
      condition: 'applicationsThisWeek >= 5 && applicationsThisWeek <= 8',
      threshold: 8,
      type: 'on_track',
      message: 'You\'re on track with {count} tailored applications this week. Keep the quality consistent.',
    },
  ] as const,
} as const;
