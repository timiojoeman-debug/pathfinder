/**
 * TechTalk Interview Prep (10 Interviews in 30 Days)
 * Philosophy, STAR, story categories, deep-dive topics, LeetCode approach
 */
export const INTERVIEW_PREP = {
  philosophy: 'Technical skills get you to the interview. Behavioural skills get you the offer.',

  star: {
    situation: { rule: '1-2 sentences of context — set the scene briefly', common_mistake: 'Too long — keep it under 20 seconds when spoken' },
    task: { rule: 'Your specific responsibility — what was YOUR role', common_mistake: 'Describing the team\'s task instead of your personal responsibility' },
    action: { rule: 'Specific actions YOU took — use "I", not "we"', common_mistake: 'Being vague — "I helped the team" instead of "I implemented the caching layer"' },
    result: { rule: 'Quantified outcome — numbers are mandatory', common_mistake: 'No metrics — "it worked well" instead of "reduced load time by 40%"' },
  } as const,

  storyCategories: [
    { id: 'challenge', name: 'Challenge Overcome', prompt: 'Describe a significant technical or professional challenge you faced and how you overcame it.' },
    { id: 'teamwork', name: 'Teamwork', prompt: 'Describe a time you worked effectively in a team to deliver a result.' },
    { id: 'leadership', name: 'Leadership & Initiative', prompt: 'Describe a time you took the lead, proposed a new approach, or showed initiative without being asked.' },
    { id: 'failure', name: 'Failure & Learning', prompt: 'Describe a failure or mistake and what you learned from it. Interviewers want humility and growth.' },
    { id: 'time_pressure', name: 'Time Pressure', prompt: 'Describe a time you delivered under a tight deadline. How did you prioritise?' },
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
    short: { duration: '3 minutes', use: 'Quick round answer — situation + key action + result' },
    medium: { duration: '5 minutes', use: 'Standard interview answer — full STAR with detail' },
    extended: { duration: '10 minutes', use: 'Deep dive — full STAR with follow-up questions and technical detail' },
  } as const,

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
