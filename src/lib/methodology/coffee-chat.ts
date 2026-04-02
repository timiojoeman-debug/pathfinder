/**
 * TechTalk Coffee Chat Mastery
 * 4-part framework, scripts, question bank (6 categories, 2+ per), follow-up cadence
 */
export const COFFEE_CHAT = {
  framework: {
    preparation: {
      description: 'Research background, find shared connection, prepare 2-3 questions',
      steps: [
        'AI-generate a research brief on the contact',
        'Identify shared connections (university, city, interests, mutual contacts)',
        'Prepare 3 questions tailored to the contact\'s role and company',
      ],
    },
    opening: {
      script: 'Thank you so much for taking the time to speak with me today. I\'m [name], a [year] [degree] student at [university]. I\'m really interested in [area] and wanted to learn about your experience at [company]. I\'d love to hear about [specific aspect] and any advice you might have for someone looking to break into [field].',
      tips: [
        'Keep the opening under 30 seconds',
        'Express genuine appreciation for their time',
        'Set a light agenda so they know what to expect',
        'Mention something specific about their work to show preparation',
      ],
    },
    coreConversation: {
      description: 'Ask questions, listen actively, share only when it adds value',
      actions: [
        'Lead with prepared questions from the most relevant categories',
        'Listen for 80% of the time — this is about learning, not pitching',
        'Take brief notes on key insights (with permission)',
        'Share your experience only when it directly relates to their point',
        'If they mention a challenge, connect it to something you\'ve worked on',
      ],
    },
    closing: {
      description: 'Summarise takeaways, ask for referral if appropriate',
      referralAsk: {
        direct: {
          script: 'Would you feel comfortable referring me for the [role title] position?',
          when: 'Use when the conversation went very well, they expressed enthusiasm, or they offered to help',
        },
        indirect: {
          script: 'What would you recommend I focus on to be a stronger candidate for roles like this?',
          when: 'Use when the conversation was positive but you\'re not sure about their enthusiasm level, or it\'s a first interaction',
        },
        guidance: 'If unsure which to use, default to indirect. A strong indirect ask often leads to a voluntary referral offer.',
      },
    },
  } as const,

  experienceLevelCalibration: {
    firstTimer: {
      condition: 'coffeeChatsDone === 0',
      approach: 'Full framework explanation with detailed scripts and step-by-step guidance',
    },
    beginner: {
      condition: 'coffeeChatsDone 1-2',
      approach: 'Framework reference with personalised prep for this specific contact',
    },
    experienced: {
      condition: 'coffeeChatsDone >= 3',
      approach: 'Strategic advice focused on this specific contact — skip the framework basics',
    },
  } as const,

  questionBank: {
    'Internship Experience': [
      'What did you wish you knew before starting your internship?',
      'What was the most valuable thing you learned during your internship?',
      'What surprised you most about the day-to-day work compared to university?',
    ],
    'Mentorship & Growth': [
      'How did you find mentors early in your career?',
      'What resources or habits helped you grow the most as an engineer?',
      'Is there a particular project or challenge that accelerated your learning?',
    ],
    'Next Steps': [
      'What would you recommend I focus on in the next 3-6 months?',
      'Are there any roles or teams you think I should look into?',
      'If you were starting over today, what would you do differently?',
    ],
    'Day-to-Day Insights': [
      'What does a typical day look like on your team?',
      'What\'s the most challenging part of your role?',
      'How does your team approach code reviews and collaboration?',
    ],
    'Career Advice': [
      'What skills do you think are most important for someone in my position?',
      'How do you stay current with new technologies and industry trends?',
      'What\'s the best career advice you\'ve ever received?',
    ],
    'Self-Fit Diagnostic': [
      'What kind of person thrives in this role or on this team?',
      'How would you describe the team culture?',
      'What does success look like in the first 3 months of this internship?',
    ],
  } as const,

  referralAsks: {
    direct: 'Would you feel comfortable referring me for the [role] position?',
    indirect: 'What should I focus on to be a stronger candidate for roles like this?',
  } as const,

  followUpCadence: [
    {
      step: 1,
      timing: 'Within 24 hours',
      purpose: 'Thank-you message',
      template: 'Thank you so much for your time and insights today. I really appreciated [specific insight from conversation]. I\'ll [action you mentioned taking]. Would love to stay in touch.',
      rule: 'REFUSES to generate if chat notes are empty — "I need to know what you discussed to write a genuine follow-up."',
    },
    {
      step: 2,
      timing: '4-10 days',
      purpose: 'Action proof — show you acted on their advice',
      template: 'Following up — I [action taken based on their advice]. [Brief result or progress update]. Would appreciate any other thoughts you might have.',
      rule: 'If student has not taken action, prompt them: "What did they suggest? Have you started?"',
    },
    {
      step: 3,
      timing: '10-15 days',
      purpose: 'Value-add share — send a relevant article or resource',
      template: 'Came across [article/resource] that reminded me of our conversation about [topic]. Thought you might find it useful.',
      rule: 'Suggest finding a relevant resource if none comes to mind',
    },
    {
      step: 4,
      timing: '15+ days',
      purpose: 'Long-term relationship maintenance',
      template: 'Hope you\'re doing well. Wanted to keep you posted — [brief progress update]. Still very interested in [company/role]. Happy to reconnect when timing works.',
      rule: 'Generate using full relationship context from the database',
    },
  ] as const,
} as const;
