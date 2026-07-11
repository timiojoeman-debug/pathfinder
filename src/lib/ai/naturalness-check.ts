export interface NaturalnessIssue {
  type:
    | 'em_dash'
    | 'formal_language'
    | 'fake_metric'
    | 'repetitive_structure'
    | 'wrong_spelling_region'
    | 'buzzword'
    | 'too_long';
  description: string;
  location: string;
  suggestion: string;
}

export interface NaturalnessResult {
  score: number; // 0-100, where 100 = perfectly natural
  issues: NaturalnessIssue[];
  verdict: 'natural' | 'mostly_natural' | 'needs_editing' | 'heavily_ai';
}

const FORMAL_PHRASES: [RegExp, string][] = [
  [/I am writing to express my keen interest/gi, 'Try a direct opener about why the role caught your eye'],
  [/I would be delighted to/gi, "Use 'I'd love to' instead"],
  [/(?:^|\.\s+)Furthermore/gm, "Drop it -- just start the next sentence"],
  [/(?:^|\.\s+)Moreover/gm, "Drop it -- just start the next sentence"],
  [/In conclusion/gi, "Remove -- your last paragraph speaks for itself"],
  [/I am confident that/gi, "Show confidence through specifics, not declarations"],
  [/I am eager to/gi, "Use 'I want to' or show eagerness through actions"],
  [/It would be a privilege/gi, "Too formal -- say what excites you instead"],
  [/I am particularly drawn to/gi, "Say what specifically interests you in plainer language"],
  [/I wish to convey/gi, "Just say it directly"],
  [/Herewith/gi, "Remove -- unnecessary formality"],
  [/Pursuant to/gi, "Use 'following' or 'about'"],
  [/In regard to/gi, "Use 'about' or 'regarding'"],
  [/I humbly/gi, "Drop the false modesty -- be direct"],
];

const BUZZWORDS: RegExp[] = [
  /leverage synergies/gi,
  /drive impactful outcomes/gi,
  /passionate about innovation/gi,
  /leverage my skills/gi,
  /leverage my experience/gi,
  /dynamic environment/gi,
  /fast-paced environment/gi,
  /think outside the box/gi,
  /hit the ground running/gi,
  /go-getter/gi,
  /synergistic/gi,
  /paradigm shift/gi,
  /value proposition/gi,
  /holistic approach/gi,
  /cutting-edge/gi,
  /best-in-class/gi,
];

// US spelling -> UK spelling
const SPELLING_PAIRS: [string, string][] = [
  ['organize', 'organise'],
  ['optimize', 'optimise'],
  ['analyze', 'analyse'],
  ['utilize', 'utilise'],
  ['realize', 'realise'],
  ['recognize', 'recognise'],
  ['customize', 'customise'],
  ['prioritize', 'prioritise'],
  ['specialize', 'specialise'],
  ['summarize', 'summarise'],
  ['behavior', 'behaviour'],
  ['color', 'colour'],
  ['favor', 'favour'],
  ['honor', 'honour'],
  ['labor', 'labour'],
  ['neighbor', 'neighbour'],
  ['center', 'centre'],
  ['fiber', 'fibre'],
  ['theater', 'theatre'],
];

const PENALTY: Record<NaturalnessIssue['type'], number> = {
  em_dash: 5,
  formal_language: 8,
  fake_metric: 10,
  repetitive_structure: 15,
  wrong_spelling_region: 3,
  buzzword: 7,
  too_long: 10,
};

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function checkNaturalness(
  text: string,
  options: {
    region?: 'uk' | 'us';
    type: 'outreach' | 'cover_letter';
    studentCvMetrics?: string[];
  }
): NaturalnessResult {
  const issues: NaturalnessIssue[] = [];
  const words = wordCount(text);

  // --- a) Em-dash overuse ---
  const emDashMatches = text.match(/\u2014/g) || [];
  let emDashLimit = 2;
  if (words < 200) emDashLimit = 1;
  else if (words < 400) emDashLimit = 2;
  if (emDashMatches.length > emDashLimit) {
    const excess = emDashMatches.length - emDashLimit;
    for (let i = 0; i < excess; i++) {
      issues.push({
        type: 'em_dash',
        description: 'Overuse of em-dashes is a common AI writing pattern',
        location: '\u2014',
        suggestion: 'Replace with a comma, full stop, or rewrite the sentence',
      });
    }
  }

  // --- b) Overly formal language ---
  for (const [pattern, suggestion] of FORMAL_PHRASES) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        issues.push({
          type: 'formal_language',
          description: 'Overly formal phrasing that reads as AI-generated',
          location: match,
          suggestion,
        });
      }
    }
  }

  // --- c) Fake metrics ---
  const metricMatches = text.match(/\d+%/g) || [];
  const whitelist = options.studentCvMetrics ?? [];
  for (const metric of metricMatches) {
    if (!whitelist.includes(metric)) {
      issues.push({
        type: 'fake_metric',
        description: 'Percentage not found in your CV data',
        location: metric,
        suggestion: 'Only include metrics from your actual experience.',
      });
    }
  }

  // --- d) Repetitive sentence structure ---
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let consecutiveI = 0;
  let flaggedRepetitive = false;
  for (const sentence of sentences) {
    if (/^\s*I\b/.test(sentence)) {
      consecutiveI++;
      if (consecutiveI >= 3 && !flaggedRepetitive) {
        flaggedRepetitive = true;
        issues.push({
          type: 'repetitive_structure',
          description: '3+ consecutive sentences starting with "I"',
          location: 'Multiple sentences beginning with "I"',
          suggestion: 'Vary your sentence openings.',
        });
      }
    } else {
      consecutiveI = 0;
    }
  }

  // --- e) Wrong spelling region ---
  if (options.region) {
    for (const [us, uk] of SPELLING_PAIRS) {
      if (options.region === 'uk') {
        // Check for US spellings
        const re = new RegExp(`\\b${us}\\b`, 'gi');
        const matches = text.match(re);
        if (matches) {
          for (const match of matches) {
            issues.push({
              type: 'wrong_spelling_region',
              description: `US spelling detected in UK-region text`,
              location: match,
              suggestion: `Use "${uk}" instead of "${us}"`,
            });
          }
        }
      } else {
        // Check for UK spellings
        const re = new RegExp(`\\b${uk}\\b`, 'gi');
        const matches = text.match(re);
        if (matches) {
          for (const match of matches) {
            issues.push({
              type: 'wrong_spelling_region',
              description: `UK spelling detected in US-region text`,
              location: match,
              suggestion: `Use "${us}" instead of "${uk}"`,
            });
          }
        }
      }
    }
  }

  // --- f) Buzzword density ---
  for (const pattern of BUZZWORDS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        issues.push({
          type: 'buzzword',
          description: 'Corporate buzzword that weakens your message',
          location: match,
          suggestion: 'Replace with specific, concrete language',
        });
      }
    }
  }

  // --- g) Length check ---
  const maxWords = options.type === 'outreach' ? 150 : 350;
  if (words > maxWords) {
    issues.push({
      type: 'too_long',
      description: `Text is ${words} words (limit: ${maxWords} for ${options.type === 'outreach' ? 'outreach messages' : 'cover letters'})`,
      location: `${words} words`,
      suggestion: `Cut to under ${maxWords} words. Shorter messages get more responses.`,
    });
  }

  // --- Scoring ---
  let score = 100;
  for (const issue of issues) {
    score -= PENALTY[issue.type];
  }
  score = Math.max(0, score);

  // --- Verdict ---
  let verdict: NaturalnessResult['verdict'];
  if (score >= 80) verdict = 'natural';
  else if (score >= 50) verdict = 'mostly_natural';
  else if (score >= 25) verdict = 'needs_editing';
  else verdict = 'heavily_ai';

  return { score, issues, verdict };
}
