import { describe, it, expect } from 'vitest';
import {
  retrieveKnowledge,
  decide,
  renderKnowledgeBlock,
  getConcept,
  getLearningPaths,
  listDomains,
  NETWORKING_KNOWLEDGE,
  JOBS_KNOWLEDGE,
  CV_KNOWLEDGE,
  SOURCES,
  type DecisionContext,
  type DomainKnowledge,
} from '../index';

const ALL_DOMAINS: DomainKnowledge[] = [NETWORKING_KNOWLEDGE, JOBS_KNOWLEDGE, CV_KNOWLEDGE];

const base: DecisionContext = {
  domain: 'networking',
  contactsCount: 0,
  coffeeChatsDone: 0,
  applicationsTotal: 0,
  experienceLevel: 'beginner',
};

describe('knowledge integrity', () => {
  it('registers the networking, jobs, and cv domains', () => {
    expect(listDomains()).toEqual(expect.arrayContaining(['networking', 'jobs', 'cv']));
  });

  it.each(ALL_DOMAINS)('$domain: every artefact references only known sources', (k) => {
    const ids = [
      ...k.principles.flatMap((p) => p.sourceIds),
      ...k.frameworks.flatMap((f) => f.sourceIds),
      ...k.concepts.flatMap((c) => c.sourceIds),
      ...k.playbooks.flatMap((pb) => pb.sourceIds),
    ];
    for (const id of ids) {
      expect(SOURCES[id], `unknown source id: ${id}`).toBeDefined();
    }
  });

  it.each(ALL_DOMAINS)('$domain: concept prerequisites resolve to real concepts', (k) => {
    const conceptIds = new Set(k.concepts.map((c) => c.id));
    for (const c of k.concepts) {
      for (const pre of c.prerequisiteIds) {
        expect(conceptIds.has(pre), `dangling prerequisite ${pre}`).toBe(true);
      }
    }
  });

  it.each(ALL_DOMAINS)('$domain: decision rules reference real principles and concepts', (k) => {
    const principleIds = new Set(k.principles.map((p) => p.id));
    const conceptIds = new Set(k.concepts.map((c) => c.id));
    for (const r of k.decisionRules) {
      expect(principleIds.has(r.principleId)).toBe(true);
      expect(conceptIds.has(r.teachesConceptId)).toBe(true);
    }
  });

  it('artefact ids are globally unique across domains', () => {
    const ids = ALL_DOMAINS.flatMap((k) => [
      ...k.principles.map((p) => p.id),
      ...k.frameworks.map((f) => f.id),
      ...k.concepts.map((c) => c.id),
      ...k.playbooks.map((pb) => pb.id),
      ...k.decisionRules.map((r) => r.id),
      ...k.learningPaths.map((lp) => lp.id),
    ]);
    expect(new Set(ids).size, 'duplicate artefact id across domains').toBe(ids.length);
  });
});

describe('retrieval order', () => {
  it('returns compressed knowledge first, with provenance', () => {
    const r = retrieveKnowledge('how do referrals beat cold applications', 'networking');
    expect(r.principles.length).toBeGreaterThan(0);
    expect(r.principles[0].id).toBe('p-referral-leverage');
    // Sources surface last as provenance for what was found.
    expect(r.sources.length).toBeGreaterThan(0);
  });

  it('renders a citation-bearing prompt block', () => {
    const block = renderKnowledgeBlock('coffee chat networking referral', 'networking');
    expect(block).toContain('Principles:');
    expect(block).toContain('Sources:');
  });

  it('returns empty block when nothing matches', () => {
    expect(renderKnowledgeBlock('quantum chromodynamics lattice', 'networking')).toBe('');
  });
});

describe('decision engine', () => {
  it('tells a high-volume cold applicant to build warm contacts', () => {
    const g = decide({ ...base, applicationsTotal: 25, contactsCount: 1 });
    expect(g).not.toBeNull();
    expect(g!.action.toLowerCase()).toContain('warm');
    expect(g!.learning.conceptId).toBe('c-referral-leverage');
    expect(g!.sources.length).toBeGreaterThan(0);
    expect(g!.reflection.length).toBeGreaterThan(0);
  });

  it('tells someone with contacts but no chats to run coffee chats', () => {
    const g = decide({ ...base, contactsCount: 4, coffeeChatsDone: 0 });
    expect(g!.learning.conceptId).toBe('c-coffee-chat');
  });

  it('prioritises the deadline rule when a window is closing', () => {
    const g = decide({ ...base, contactsCount: 3, applicationsTotal: 1, daysToDeadline: 7 });
    // deadline (85) outranks the beginner-start rule (60)
    expect(g!.learning.conceptId).toBe('c-hidden-job-market');
    expect(g!.action.toLowerCase()).toContain('heads-up');
  });

  it('returns null when no rule matches', () => {
    const g = decide({ ...base, contactsCount: 20, coffeeChatsDone: 10, applicationsTotal: 5, experienceLevel: 'advanced' });
    expect(g).toBeNull();
  });
});

describe('jobs domain', () => {
  const jobsBase: DecisionContext = {
    domain: 'jobs',
    contactsCount: 0,
    coffeeChatsDone: 0,
    applicationsTotal: 0,
    experienceLevel: 'beginner',
  };

  it('tells a user inside a closing window to apply today', () => {
    const g = decide({ ...jobsBase, experienceLevel: 'intermediate', daysToDeadline: 2 });
    expect(g).not.toBeNull();
    expect(g!.action.toLowerCase()).toContain('apply today');
    expect(g!.learning.conceptId).toBe('c-apply-early');
    expect(g!.sources.length).toBeGreaterThan(0);
  });

  it('flags high generic volume with no referrals', () => {
    const g = decide({ ...jobsBase, experienceLevel: 'intermediate', applicationsTotal: 20, referralRate: 0 });
    expect(g!.learning.conceptId).toBe('c-ai-screening');
  });

  it('retrieves apply-early principle for a timing query scoped to jobs', () => {
    const r = retrieveKnowledge('when should I apply rolling deadline early', 'jobs');
    expect(r.principles.some((p) => p.id === 'p-apply-early')).toBe(true);
  });

  it('exposes beginner→advanced jobs learning paths', () => {
    expect(getLearningPaths('jobs').map((p) => p.level).sort()).toEqual([
      'advanced', 'beginner', 'intermediate',
    ]);
  });
});

describe('cv domain', () => {
  const cvBase: DecisionContext = {
    domain: 'cv',
    contactsCount: 0,
    coffeeChatsDone: 0,
    applicationsTotal: 0,
    experienceLevel: 'intermediate',
  };

  it('tells a user with no proof to add evidence', () => {
    const g = decide({ ...cvBase, hasProof: false });
    expect(g).not.toBeNull();
    expect(g!.learning.conceptId).toBe('c-proof-of-work');
    expect(g!.sources.length).toBeGreaterThan(0);
  });

  it('tells a weak-scoring CV to optimise for the screening gates', () => {
    const g = decide({ ...cvBase, cvScore: 45 });
    expect(g!.learning.conceptId).toBe('c-ats-optimization');
  });

  it('does not fire CV rules when CV signals are absent (non-beginner)', () => {
    const g = decide({ ...cvBase });
    expect(g).toBeNull();
  });

  it('retrieves the proof-of-work principle for a CV query scoped to cv', () => {
    const r = retrieveKnowledge('how do I prove my cv evidence achievements', 'cv');
    expect(r.principles.some((p) => p.id === 'p-show-dont-tell')).toBe(true);
  });
});

describe('curriculum', () => {
  it('exposes beginner→advanced learning paths', () => {
    const paths = getLearningPaths('networking');
    expect(paths.map((p) => p.level).sort()).toEqual(['advanced', 'beginner', 'intermediate']);
  });

  it('every learning module references real concepts', () => {
    for (const domain of ['networking', 'jobs', 'cv'] as const) {
      for (const p of getLearningPaths(domain)) {
        for (const m of p.modules) {
          for (const cid of m.conceptIds) {
            expect(getConcept(cid), `module ${m.id} references missing concept ${cid}`).toBeDefined();
          }
        }
      }
    }
  });
});
