import { describe, it, expect } from 'vitest';
import { deriveProfile, type ProfileInput } from '../profile';
import { computeProgress } from '../progress';
import { EMPTY_BOARD } from '../data';
import type { OnbState } from '../logic';
import type { SavedJob } from '../store';

/**
 * These tests guard the "a new user starts from a true blank state" behaviour:
 * the derivation must not invent progress from seeded defaults (LeetCode base,
 * netSent, board seed, market prospects). If any of those regress, the blank
 * dashboard silently fills with fake data again.
 */

const emptyOnb: OnbState = {
  step: 1, role: null, industry: null, stage: null,
  cv: null, projects: null, outreach: null, cadence: null,
};

function makeInput(overrides: Partial<ProfileInput> = {}): ProfileInput {
  return {
    onb: emptyOnb, onbDone: false,
    dirRole: null, dirStack: [], dirIndustry: null, dirSize: null, dirSetting: null, dirGenerated: false,
    chat: [],
    cvText: '', cvAnalyzed: false, cvProjects: false, cvLinkedIn: false, cvScores: [],
    savedJobs: [],
    netPersona: 'Recruiter', netSent: 0, netGenerated: false,
    ivSolved: {}, ivFeedback: [],
    board: EMPTY_BOARD, diags: {}, events: [],
    ...overrides,
  };
}

const savedJob = (company: string, fit = 70): SavedJob => ({
  company, role: 'SWE Intern', meta: '', fit, dash: 0, tone: '', tags: [], verdict: '', action: '',
});

describe('deriveProfile — a new user starts blank', () => {
  const p = deriveProfile(makeInput());

  it('has no direction and sits on the first phase', () => {
    expect(p.directionSet).toBe(false);
    expect(p.currentPhase).toBe('direction');
  });

  it('has zero LeetCode solved (no seeded base of 19+ patterns)', () => {
    expect(p.leetSolved).toBe(0);
  });

  it('has no target companies (no seeded market prospects)', () => {
    expect(p.targetCompanies).toHaveLength(0);
  });

  it('has an empty pipeline and no outreach', () => {
    expect(p.applicationsSubmitted).toBe(0);
    expect(p.interviewsLanded).toBe(0);
    expect(p.offers).toBe(0);
    expect(p.outreachSent).toBe(0);
  });

  it('has no ATS score before the CV is analysed', () => {
    expect(p.atsScore).toBeNull();
  });
});

describe('computeProgress — a blank profile is 0%', () => {
  it('overall readiness is 0 and every phase is 0', () => {
    const prog = computeProgress(deriveProfile(makeInput()));
    expect(prog.overall).toBe(0);
    for (const phase of prog.phases) expect(phase.pct).toBe(0);
  });
});

describe('deriveProfile — reflects real activity only', () => {
  it('setting a direction advances the current phase to cv', () => {
    const p = deriveProfile(makeInput({
      dirRole: 'Backend', dirIndustry: 'Fintech', dirSize: 'Big Tech', dirGenerated: true,
    }));
    expect(p.directionSet).toBe(true);
    expect(p.currentPhase).toBe('cv');
  });

  it('counts only real logged LeetCode progress', () => {
    const p = deriveProfile(makeInput({ ivSolved: { 'Two Pointers': 5 } }));
    expect(p.leetSolved).toBe(5);
  });

  it('turns saved jobs into target companies without counting them as submissions', () => {
    const p = deriveProfile(makeInput({ savedJobs: [savedJob('Acme', 72)] }));
    expect(p.targetCompanies).toHaveLength(1);
    expect(p.targetCompanies[0].company).toBe('Acme');
    expect(p.applicationsSubmitted).toBe(0);
  });

  it('lifts overall readiness above 0 once there is activity', () => {
    const prog = computeProgress(deriveProfile(makeInput({
      dirRole: 'Backend', dirIndustry: 'Fintech', dirSize: 'Big Tech', dirGenerated: true,
    })));
    expect(prog.overall).toBeGreaterThan(0);
  });
});
