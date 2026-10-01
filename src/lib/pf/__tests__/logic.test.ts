import { describe, it, expect } from 'vitest';
import {
  toneFor, fitTone,
  readinessFrom,
  directionReady, directionStatement, directionSpecificity, extractChatPatch,
  targetKeywords, analyzeCvText,
  roleFit, analyzeJobDescription,
  buildCoverLetter, followUpMessage,
  trackerDerived,
  roleFamiliesFor, outreachSubject, buildOutreachTemplate,
  jobPassesFit, composeSharedAttributes,
  type OnbState, type DirectionFields,
} from '../logic';
import { DIR_ROLE_OPTS, EMPTY_BOARD, DEFAULT_TARGET_KEYWORDS, OUTREACH_PERSONAS, type BoardCard } from '../data';

/* ── helpers ──────────────────────────────────────────────────────── */

const dir = (over: Partial<DirectionFields> = {}): DirectionFields => ({
  dirRole: null, dirStack: [], dirIndustry: null, dirSize: null, dirSetting: null, ...over,
});

const mkCard = (key: string): BoardCard => ({
  key, company: key, role: 'SWE Intern', tag: '', tone: '', when: 'new', match: 60, note: '',
});

/** Build a board from a per-column card count. */
function boardWith(counts: Partial<Record<string, number>>) {
  return EMPTY_BOARD.map((col) => ({
    ...col,
    cards: Array.from({ length: counts[col.id] ?? 0 }, (_, i) => mkCard(`${col.id}-${i}`)),
  }));
}

/* ── scales ───────────────────────────────────────────────────────── */

describe('score → tone thresholds', () => {
  it('toneFor uses 65 / 45 breakpoints', () => {
    expect(toneFor(70)).toBe('var(--strong)');
    expect(toneFor(50)).toBe('var(--warn)');
    expect(toneFor(30)).toBe('var(--risk)');
  });
  it('fitTone uses 70 / 55 breakpoints', () => {
    expect(fitTone(80)).toBe('var(--strong)');
    expect(fitTone(60)).toBe('var(--warn)');
    expect(fitTone(40)).toBe('var(--risk)');
  });
});

describe('readinessFrom', () => {
  const complete: OnbState = { step: 3, role: 'SWE', industry: 'Fintech', stage: 'Big Tech', cv: 80, projects: 70, outreach: 60, cadence: 80 };

  it('counts an unanswered self-assessment as 0, never an invented baseline', () => {
    // 8.2 + 24 + 22.75 + 0 = 54.95 → 55 (it used to return a flat 74 here)
    expect(readinessFrom({ ...complete, cadence: null })).toBe(55);
    expect(readinessFrom({ ...complete, cv: null, projects: null, outreach: null, cadence: null })).toBe(8);
  });
  it('computes a weighted score once complete', () => {
    // 82*.1 + 80*.3 + ((70+60)/2)*.35 + 80*.25 = 8.2 + 24 + 22.75 + 20 = 74.95 → 75
    expect(readinessFrom(complete)).toBe(75);
  });
});

/* ── direction ────────────────────────────────────────────────────── */

describe('direction derivations', () => {
  it('requires role + industry + size to be ready', () => {
    expect(directionReady(dir({ dirRole: 'Backend', dirIndustry: 'Fintech', dirSize: 'Big Tech' }))).toBe(true);
    expect(directionReady(dir({ dirRole: 'Backend' }))).toBe(false);
  });

  it('composes a readable statement from the fields', () => {
    const s = directionStatement(dir({ dirRole: 'Backend', dirIndustry: 'Fintech', dirSize: 'Big Tech', dirStack: ['Go', 'SQL'] }));
    expect(s).toContain('Backend internships in fintech at big tech');
    expect(s).toContain('Go / SQL');
  });

  it('prompts to pick fields when not ready', () => {
    expect(directionStatement(dir())).toMatch(/pick a role/i);
  });

  it('grades specificity by how many fields are chosen', () => {
    expect(directionSpecificity(dir()).label).toMatch(/low/i);
    expect(directionSpecificity(dir({ dirRole: 'x', dirIndustry: 'y', dirSize: 'z' })).label).toMatch(/medium/i);
    expect(directionSpecificity(dir({ dirRole: 'x', dirIndustry: 'y', dirSize: 'z', dirSetting: 'Remote', dirStack: ['React'] })).label).toMatch(/high/i);
  });

  it('extracts wizard fields from free text', () => {
    const patch = extractChatPatch('I love frontend work at fintech startups');
    expect(patch.dirRole).toBe('Frontend');
    expect(patch.dirIndustry).toBe('Fintech');
    expect(patch.dirSize).toBe('Startups 0–50');
  });
});

/* ── CV analysis ──────────────────────────────────────────────────── */

describe('analyzeCvText', () => {
  it('defaults target keywords when no direction stack is set', () => {
    expect(targetKeywords([])).toEqual(DEFAULT_TARGET_KEYWORDS);
    expect(targetKeywords(['Go'])).toEqual(['Go']);
  });

  it('scores a strong CV high with no vague terms or missing keywords', () => {
    const a = analyzeCvText('Built and shipped with React, TypeScript, Node and SQL.', []);
    expect(a.vague).toHaveLength(0);
    expect(a.missing).toHaveLength(0);
    expect(a.score).toBe(92);
    expect(a.tone).toBe('var(--strong)');
  });

  it('penalises vague terms and missing keywords', () => {
    const a = analyzeCvText('Responsible for various tasks.', ['React']);
    // "responsible for" + "various" = 2 vague (-14); "React" missing (-6) → 92-20 = 72
    expect(a.vague.length).toBe(2);
    expect(a.missing.map((m) => m.label)).toContain('React');
    expect(a.score).toBe(72);
  });

  it('never scores below 25 or above 95', () => {
    const bad = analyzeCvText('responsible for helped worked on assisted various involved in', ['React', 'Go', 'Rust', 'Kafka', 'AWS']);
    expect(bad.score).toBeGreaterThanOrEqual(25);
    expect(bad.score).toBeLessThanOrEqual(95);
  });
});

/* ── job-description analysis ─────────────────────────────────────── */

describe('roleFit', () => {
  it('penalises senior / high-YOE postings', () => {
    const fit = roleFit('Senior engineer, 5+ years required', 74, '', []);
    expect(fit).toBeLessThan(74);
  });
  it('rewards keyword overlap with CV / target stack', () => {
    const fit = roleFit('React and TypeScript role', 70, 'react typescript', ['React', 'TypeScript']);
    expect(fit).toBeGreaterThan(70);
  });
  it('clamps to the 20–95 range', () => {
    expect(roleFit('senior staff phd 9+ years', 30, '', [])).toBeGreaterThanOrEqual(20);
  });
});

describe('analyzeJobDescription', () => {
  it('flags a no-sponsorship blocker', () => {
    const r = analyzeJobDescription('Great role. We are unable to sponsor visas.', '', []);
    expect(r.hasBlockers).toBe(true);
    expect(r.blockers.some((b) => /sponsorship/i.test(b.text))).toBe(true);
  });
  it('reports no blockers for a clean junior JD', () => {
    const r = analyzeJobDescription('Internship building React apps with TypeScript.', 'react typescript', ['React', 'TypeScript']);
    expect(r.noBlockers).toBe(true);
    expect(r.compat).toBeGreaterThan(0);
  });
});

/* ── generated content stays identity-neutral ─────────────────────── */

describe('generated content has no hardcoded identity', () => {
  it('cover letter omits the old Alex / Edinburgh / 40+ specifics', () => {
    const cl = buildCoverLetter('Acme', 'Backend Intern', 'We value testing and Node.', ['Node', 'SQL']);
    const all = `${cl.p1} ${cl.p2} ${cl.p3} ${cl.assumptions.join(' ')}`;
    expect(all).not.toMatch(/Edinburgh|Alex|40\+/);
    expect(cl.p1).toContain('Acme');
    expect(cl.words).toBeGreaterThan(0);
  });
  it('follow-up message is unsigned (no Alex)', () => {
    expect(followUpMessage('Priya · Recruiter')).not.toMatch(/Alex/);
  });
});

/* ── tracker derivations ──────────────────────────────────────────── */

describe('trackerDerived', () => {
  it('is empty for a fresh board', () => {
    const d = trackerDerived(EMPTY_BOARD, 0);
    expect(d.submitted).toBe(0);
    expect(d.interviews).toBe(0);
    expect(d.offers).toBe(0);
    expect(d.leakLabel).toMatch(/too few submissions/i);
  });

  it('counts submissions, interviews and offers across columns', () => {
    const d = trackerDerived(boardWith({ saved: 3, applied: 2, interview: 1, offer: 1, rejected: 1 }), 5);
    // submitted = applied+interview+offer+rejected (saved excluded)
    expect(d.submitted).toBe(5);
    // interviews = interview + offer
    expect(d.interviews).toBe(2);
    expect(d.offers).toBe(1);
  });
});

/* ── target role families ─────────────────────────────────────────── */

describe('roleFamiliesFor', () => {
  it('gives exactly three families for every wizard role', () => {
    for (const role of DIR_ROLE_OPTS) {
      const fams = roleFamiliesFor(role);
      expect(fams, role).toHaveLength(3);
    }
  });

  it('leads with a Primary family that names the chosen role', () => {
    const fams = roleFamiliesFor('Frontend');
    expect(fams[0].relation).toBe('Primary');
    expect(fams[0].title.toLowerCase()).toContain('frontend');
  });

  it('carries no fabricated fit score — only a relation label', () => {
    const fams = roleFamiliesFor('Full-Stack SWE');
    const relations = fams.map((f) => f.relation);
    expect(relations).toContain('Primary');
    for (const f of fams) {
      expect(['Primary', 'Adjacent', 'Stretch']).toContain(f.relation);
      expect(f).not.toHaveProperty('fit');
    }
  });

  it('falls back to Full-Stack families for an unknown or null role', () => {
    expect(roleFamiliesFor(null)).toEqual(roleFamiliesFor('Full-Stack SWE'));
    expect(roleFamiliesFor('Nonsense')).toEqual(roleFamiliesFor('Full-Stack SWE'));
  });
});

/* ── outreach templates ───────────────────────────────────────────── */

describe('outreachSubject', () => {
  it('returns a non-empty subject for every persona', () => {
    for (const persona of OUTREACH_PERSONAS) {
      expect(outreachSubject(persona, 'SWE Intern').trim().length, persona).toBeGreaterThan(0);
    }
  });
});

describe('buildOutreachTemplate', () => {
  const opts = { name: 'Alex', company: 'Acme', role: 'SWE Intern', techs: 'React, Node' };

  it('addresses the real recipient by name, never a hardcoded contact', () => {
    const paras = buildOutreachTemplate('Recruiter', opts).join(' ');
    expect(paras).toContain('Alex');
    expect(paras).not.toMatch(/Priya|Marc|Tom|Sara/);
  });

  it('falls back to a neutral greeting when no name is given', () => {
    const paras = buildOutreachTemplate('Recruiter', { ...opts, name: '' }).join(' ');
    expect(paras).toContain('Hi there,');
  });

  it('produces a multi-paragraph draft for every persona', () => {
    for (const persona of OUTREACH_PERSONAS) {
      const paras = buildOutreachTemplate(persona, opts);
      expect(paras.length, persona).toBeGreaterThanOrEqual(2);
      expect(paras.every((p) => p.trim().length > 0), persona).toBe(true);
    }
  });

  it('mentions the company when one is supplied', () => {
    const paras = buildOutreachTemplate('Peer / alumnus', opts).join(' ');
    expect(paras).toContain('Acme');
  });
});

/* ── jobPassesFit ─────────────────────────────────────────────────── */

describe('jobPassesFit', () => {
  it('passes everything when the threshold is 0', () => {
    expect(jobPassesFit({ fit: 20 }, 0)).toBe(true);
    expect(jobPassesFit({ fit: 90 }, 0)).toBe(true);
  });

  it('keeps only roles at or above the threshold', () => {
    expect(jobPassesFit({ fit: 80 }, 80)).toBe(true);
    expect(jobPassesFit({ fit: 59 }, 60)).toBe(false);
  });

  it('hides unknown-fit roles once a threshold is set', () => {
    expect(jobPassesFit({ fit: 0, fitKnown: false }, 60)).toBe(false);
    expect(jobPassesFit({ fit: 0, fitKnown: false }, 0)).toBe(true);
  });
});

/* ── composeSharedAttributes ──────────────────────────────────────── */

describe('composeSharedAttributes', () => {
  it('leads with research findings, then the pasted profile text', () => {
    const out = composeSharedAttributes(
      { connectionPoints: ['Both at Edinburgh'], outreachAngles: ['Their edge-rendering post'] },
      { about: 'Backend engineer', experience: 'ex-Monzo' },
      'fallback',
    );
    expect(out).toBe('Both at Edinburgh | Their edge-rendering post | Backend engineer | ex-Monzo');
  });

  it('falls back when there is nothing real to personalise on', () => {
    expect(composeSharedAttributes(null, {}, 'Student targeting internships')).toBe('Student targeting internships');
    expect(composeSharedAttributes(null, { about: '   ' }, 'fallback')).toBe('fallback');
  });
});
