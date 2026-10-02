/**
 * Interview prep methodology: philosophy, STARL, story categories, deep-dive topics, LeetCode approach.
 *
 * Sources, stated honestly: this is general interview practice. The STARL structure (including
 * Learnings, and "quantify where you can") comes from the TechTalk June 2026 Masterclass, Day 3.
 * The philosophy line, story categories, project deep dives and the 6-step LeetCode approach are
 * PathFinder's own and are not taken from TechTalk. The "10 Interviews in 30 Days" deck contains
 * none of this material.
 *
 * Added from the 2 October 2026 slide audit, each cited by source id in `sourceIds`:
 * the AIM answer structure, the AI-fluency rubric, Past / Present / Future, Good vs Great and
 * the "practise out loud" note (June 2026 Masterclass, Days 1 and 3); the recruiter
 * screening-call module (the recruiter deck); and the tiered company research levels (Day 3).
 * Anything a slide showed too small to read is left out rather than guessed.
 */
export const INTERVIEW_PREP = {
  philosophy: 'Technical skills get you to the interview. Behavioural skills get you the offer.',

  star: {
    situation: { rule: '1-2 sentences of context. Set the scene and keep it brief', common_mistake: 'Too long. Keep the situation brief and get to your part' },
    task: { rule: 'Your specific responsibility — what was YOUR role', common_mistake: 'Describing the team\'s task instead of your personal responsibility' },
    action: { rule: 'Specific actions YOU took — use "I", not "we"', common_mistake: 'Being vague — "I helped the team" instead of "I implemented the caching layer"' },
    result: { rule: 'The outcome. Quantify where you can: numbers make it even better', common_mistake: 'No evidence of impact, e.g. "it worked well" instead of "reduced load time by 40%"' },
    learnings: { rule: 'What you would do differently, and what you took into later work', common_mistake: 'Stopping at the result, so the interviewer never sees you reflect and grow' },
  } as const,

  storyCategories: [
    { id: 'challenge', name: 'Challenge Overcome', prompt: 'Describe a significant technical or professional challenge you faced and how you overcame it.' },
    { id: 'teamwork', name: 'Teamwork', prompt: 'Describe a time you worked effectively in a team to deliver a result.' },
    { id: 'leadership', name: 'Leadership & Initiative', prompt: 'Describe a time you took the lead, proposed a new approach, or showed initiative without being asked.' },
    { id: 'failure', name: 'Failure & Learning', prompt: 'Describe a failure or mistake and what you learned from it. Interviewers want humility and growth.' },
    { id: 'time_pressure', name: 'Time Pressure', prompt: 'Describe a time you delivered under a tight deadline. How did you prioritise?' },
    { id: 'ai_usage', name: 'AI usage', prompt: 'Describe a real piece of work where you used AI: what you used it for, how you checked its output, and what you changed after.' },
  ] as const,

  projectDeepDiveTopics: [
    { topic: 'Architecture', prompt: 'How is the system structured? Why did you choose this architecture?' },
    { topic: 'Technical Decisions', prompt: 'What key technical decisions did you make and why? (e.g., "Why PostgreSQL over MongoDB?")' },
    { topic: 'Challenges', prompt: 'What was the hardest technical challenge? How did you debug and solve it?' },
    { topic: 'Trade-offs', prompt: 'What trade-offs did you make? (performance vs. readability, speed vs. quality)' },
    { topic: 'Scalability', prompt: 'How would you scale this system? What would break first at 10x/100x users?' },
    { topic: 'Security', prompt: 'What security considerations did you address? (auth, input validation, data protection)' },
  ] as const,

  practiceTimings: {
    brief: { duration: '1-2 minutes', use: 'Screening-call and "tell me about yourself" length: three points, then stop' },
    short: { duration: '3 minutes', use: 'Quick round answer: situation + key action + result' },
    medium: { duration: '5 minutes', use: 'Standard interview answer: full STARL with detail' },
  } as const,

  /** "How do you use AI in your work?" Source: June 2026 Masterclass Day 3 (slides 045, 050-052). */
  aim: {
    question: 'If we hire you, how would you use AI in your work?',
    steps: [
      { letter: 'A', name: 'Acknowledge', action: 'Show you understand why AI matters in this field: it enhances skills rather than replacing them.' },
      { letter: 'I', name: 'Illustrate', action: 'Say how you personally would use it in this role, with one clear example. If you have a project, tell it as STARL. If not, say how you have upskilled: courses, experiments, reading.' },
      { letter: 'M', name: 'Move Forward', action: 'End with curiosity about how their team uses AI, for example which tools they have adopted or are exploring.' },
    ],
    caution: 'The Day 3 slides list "not showing proof of work or AI fluency" among the reasons people get stuck. Have a real example ready.',
    sourceIds: ['wiki-techtalk-masterclass'],
  },

  /** Zapier's AI fluency components and the Capable-level evidence that was legible on the slides
   *  (June 2026 Masterclass Day 1 slides 025-026). The Adoptive and Transformative cells were too small to
   *  read reliably, so only their one-line headings are kept. */
  aiFluency: {
    credit: 'Zapier AI Fluency rubric (updated March 2026), as shown in the TechTalk June 2026 Masterclass, Days 1 and 3',
    components: [
      { id: 'mindset', name: 'Mindset', meaning: 'Continuously learning and experimenting with AI', capable: 'You have tried more than one tool and can describe how your use changed across two or three points in time: what you started with, what you switched to, and why.' },
      { id: 'strategy', name: 'Strategy', meaning: 'Deciding where AI belongs in the work and why', capable: 'You can explain why you use AI for some parts of your work and not others.' },
      { id: 'building', name: 'Building', meaning: 'Partnering with AI to produce quality results through clear communication and iteration', capable: 'You have built a repeatable tool or workflow for something you do regularly.' },
      { id: 'accountability', name: 'Accountability', meaning: 'Human judgement to define success, evaluate outputs and own results', capable: 'You check output against a standard you defined, and can describe catching and fixing a problem before it shipped.' },
    ],
    levels: [
      { name: 'Unacceptable', heading: 'Resistant to AI tools or sceptical of their value' },
      { name: 'Capable', heading: 'Early user of AI tools' },
      { name: 'Adoptive', heading: 'Builds and iterates with AI to augment daily work' },
      { name: 'Transformative', heading: 'Leads AI strategy, scales enablement and rethinks workflows' },
    ],
    sourceIds: ['wiki-techtalk-masterclass', 'doc-june-day1'],
  },

  /** "Tell me about yourself", 1-2 minutes. Source: Day 3 slide 041. */
  pastPresentFuture: {
    duration: '1-2 minutes',
    steps: [
      { name: 'Past', action: 'Where you started and what you have done so far.' },
      { name: 'Present', action: 'What you are doing now. Name three projects, briefly.' },
      { name: 'Future', action: 'The next challenge you are looking for, and why this role.' },
    ],
    sourceIds: ['wiki-techtalk-masterclass'],
  },

  /** Good vs Great answers. Source: Day 3 slides 037-038. */
  goodVsGreat: {
    structure: 'Both start from structure: chronological order (first, then, lastly) and a clear storyline.',
    good: ['Uses the STAR method', 'Lists what they did', 'Ends with "everything was great"'],
    great: ['Shows rather than tells: shares the raw, inner thoughts of the moment', 'Ends on not just what they learned but how they improved'],
    sourceIds: ['wiki-techtalk-masterclass'],
  },

  /** Day 3 slide 053. */
  practiceNote: 'Over-rehearsing makes you sound like a script, not a person. Reading answers in your head is not the same as saying them, so practise out loud, and tie each answer to the role, its keywords and its skills.',

  /** Recruiter screening call. Source: the recruiter deck, slides 024-027. */
  screeningCall: {
    purpose: 'The first call checks two things: are you a fit on skills, and are you a fit on culture. It only has to be enough to move you forward to the manager.',
    failureModes: [
      { name: 'Conciseness', detail: 'Five to ten minute answers to a single question.' },
      { name: 'Precision', detail: 'Answers that are too general.' },
      { name: 'Ownership', detail: 'Saying "we" when the recruiter needs to hear "I".' },
      { name: 'Original questions', detail: 'Bringing the same questions everyone else does.' },
      { name: 'Curiosity', detail: 'Having no questions at the end.' },
    ],
    alwaysPrepare: ['What do you know about this company?', 'Why do you want to join this company?', 'Do you have any questions?'],
    delivery: [
      'Power of 3: build every answer around three points',
      'Keep it to 1-2 minutes',
      'Pause to think before you answer, and do not be afraid of silence',
      'Structure with STAR or CAR',
    ],
    sourceIds: ['deck-recruiters-looking-for'],
  },

  /** Company research levels. Source: Day 3 slides 017-019 and 022-028. */
  companyResearchTiers: {
    beginner: 'Read About Us and recent news; check the careers page and Glassdoor; look up likely interview questions.',
    intermediate: 'Research the leadership team on LinkedIn; understand their customers and pain points; look at team structure and your potential manager.',
    advanced: 'Map their competitive landscape; review funding and strategic initiatives; find CEO interviews to understand company direction.',
    note: 'What separates beginner from advanced research is critical thinking, not volume.',
    sourceIds: ['wiki-techtalk-masterclass'],
  },

  leetcode: {
    approach: 'Pattern-based learning, not memorisation. Recognise the pattern, apply the template.',
    targetProblems: '75-150 problems across all patterns',
    patterns: [
      'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack',
      'Binary Search', 'Linked List', 'Trees', 'Tries',
      'Heap / Priority Queue', 'Backtracking', 'Graphs',
      'Advanced Graphs', '1-D Dynamic Programming', '2-D Dynamic Programming',
      'Greedy', 'Intervals', 'Math & Geometry', 'Bit Manipulation',
    ],
    sixStepApproach: [
      { step: 1, name: 'Clarify', action: 'Understand the problem fully. Ask about edge cases, constraints, input format.' },
      { step: 2, name: 'Example', action: 'Work through a small example by hand. Trace through the expected behaviour.' },
      { step: 3, name: 'Approach', action: 'State your high-level strategy before writing any code. Identify the pattern.' },
      { step: 4, name: 'Code', action: 'Implement clearly with good variable names. Talk through your logic as you code.' },
      { step: 5, name: 'Test', action: 'Run through your examples. Check edge cases (empty input, single element, large input).' },
      { step: 6, name: 'Optimise', action: 'Analyse time and space complexity. Can you improve? Discuss trade-offs.' },
    ],
  } as const,
} as const;
