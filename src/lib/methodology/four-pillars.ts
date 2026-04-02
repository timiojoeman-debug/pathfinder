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
      name: 'Building & Networking',
      meaning: 'Projects that prove skills + connections that open doors',
      whyItMatters: '~80% of roles are filled through the hidden job market. Building projects fills skill gaps. Networking opens the 80% of doors that cold applications never reach.',
      timeAllocation: 'Min 35% — this is where results come from',
    },
    {
      name: 'Consistency & Interview',
      meaning: 'Regular applications, interview preparation, and follow-through',
      whyItMatters: 'Consistency beats intensity. 2-3 tailored applications per week, every week, outperforms 30 generic applications in a weekend.',
      timeAllocation: 'Min 25% — steady cadence is non-negotiable',
    },
  ] as const,

  fridayReview: {
    name: 'Lightweight Friday Review',
    description: 'Every Friday, 30-second self-check across the four pillars. No AI analysis — just visibility.',
    questions: [
      { pillar: 'Clarity', question: 'Is my direction still clear, or do I need to refine it?' },
      { pillar: 'Positioning', question: 'Did I improve my CV, LinkedIn, or portfolio this week?' },
      { pillar: 'Networking', question: 'Did I send outreach or have a coffee chat this week?' },
      { pillar: 'Consistency', question: 'Did I submit 2-3 tailored applications this week?' },
    ],
  } as const,

  weeklyTargets: {
    tailoredApplications: '2-3 per week (quality over quantity)',
    connectionRequests: '3 new connections per week',
    coffeeChats: '1 per week',
    posts: '1 LinkedIn post or comment per week',
  } as const,

  qualityWarnings: [
    {
      condition: 'applicationsThisWeek > 5',
      threshold: 5,
      type: 'too_many',
      message: 'You\'ve submitted {count} applications this week. Are they all tailored? Quality over quantity gets better results. The CV Blueprint\'s 15-minute tailoring process should be applied to every single application.',
    },
    {
      condition: 'applicationsThisWeek === 0 && dayOfWeek >= 4',
      threshold: 0,
      type: 'none_by_thursday',
      message: 'No applications yet this week and it\'s already {day}. Aim for 2-3 quality submissions before Friday. Even one well-tailored application is better than zero.',
    },
    {
      condition: 'applicationsThisWeek >= 2 && applicationsThisWeek <= 3',
      threshold: 3,
      type: 'on_track',
      message: 'You\'re on track with {count} tailored applications this week. Keep the quality consistent.',
    },
  ] as const,
} as const;
