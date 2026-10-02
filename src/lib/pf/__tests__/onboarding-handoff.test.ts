import { describe, it, expect, beforeEach } from 'vitest';
import { usePfStore } from '../store';
import { deriveProfile, type ProfileInput } from '../profile';
import { computeProgress } from '../progress';

/**
 * Stage 00 has to hand its answers to the rest of the system. Before this was
 * wired, finishing onboarding only flipped `onbDone`: the student picked a
 * target, saw a readiness baseline, then landed on a Command Centre reading 0%
 * and "No clear direction yet", with the Direction wizard blank. These tests
 * guard the handoff — and the deliberate limit on it.
 */

const initial = usePfStore.getState();

function resetStore() {
  usePfStore.setState(
    {
      ...initial,
      onb: { step: 1, role: null, industry: null, stage: null, cv: null, projects: null, outreach: null, cadence: null },
      onbDone: false,
      dirRole: null,
      dirIndustry: null,
      dirSize: null,
      dirSetting: null,
      dirGenerated: false,
      events: [],
    },
    false,
  );
}

/** Project the live store into the shape the profile derives from. */
function profileInput(): ProfileInput {
  const s = usePfStore.getState();
  return {
    onb: s.onb, onbDone: s.onbDone,
    dirRole: s.dirRole, dirStack: s.dirStack, dirIndustry: s.dirIndustry,
    dirSize: s.dirSize, dirSetting: s.dirSetting, dirGenerated: s.dirGenerated,
    chat: s.chat,
    cvText: s.cvText, cvAnalyzed: s.cvAnalyzed, cvProjects: s.cvProjects,
    cvLinkedIn: s.cvLinkedIn, cvScores: s.cvScores,
    savedJobs: s.savedJobs,
    netPersona: s.netPersona, netSent: s.netSent, netGenerated: s.netGenerated,
    ivSolved: s.ivSolved, ivFeedback: s.ivFeedback, savedStories: s.savedStories,
    board: s.board, diags: s.diags, events: s.events,
  };
}

function completeOnboarding() {
  usePfStore.getState().setOnb({
    step: 3,
    role: 'Software Engineering',
    industry: 'Fintech',
    stage: 'Seed–Series B startups',
    cv: 45, projects: 42, outreach: 42, cadence: 42,
  });
  usePfStore.getState().finishOnb();
}

describe('onboarding → Career-OS handoff', () => {
  beforeEach(resetStore);

  it('carries the onboarding target into the direction chips', () => {
    completeOnboarding();
    const s = usePfStore.getState();
    // Onboarding vocabulary is translated into the Direction wizard's chips.
    expect(s.dirRole).toBe('Full-Stack SWE');
    expect(s.dirIndustry).toBe('Fintech');
    expect(s.dirSize).toBe('Startups 0–50');
  });

  it('carries the target into Direction without marking it done', () => {
    completeOnboarding();
    const profile = deriveProfile(profileInput());
    // The chips are pre-filled, so Direction has started, but nothing counts as a
    // direction until the student composes the statement.
    expect(profile.targetRole).toBe('Full-Stack SWE');
    expect(profile.directionSet).toBe(false);
    const direction = computeProgress(profile).phases.find((p) => p.phase === 'direction');
    expect(direction!.pct).toBeGreaterThan(0);
    expect(direction!.pct).toBeLessThan(50);

    usePfStore.getState().generateDirection();
    expect(deriveProfile(profileInput()).directionSet).toBe(true);
  });

  it('logs the baseline so the timeline and AI memory start non-empty', () => {
    completeOnboarding();
    const { events } = usePfStore.getState();
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(['ProfileCreated', 'CareerDirectionUpdated']),
    );
    const baseline = events.find((e) => e.type === 'ProfileCreated');
    expect(baseline!.meta).toMatchObject({ selfRatedCv: 45, source: 'onboarding' });
  });

  it('does NOT fabricate evidence-derived progress from the self-ratings', () => {
    completeOnboarding();
    const profile = deriveProfile(profileInput());
    const byPhase = Object.fromEntries(
      computeProgress(profile).phases.map((p) => [p.phase, p.pct]),
    );
    // The student rated their CV 45 and outreach 42, but has uploaded no CV and
    // sent no messages. Those pillars must stay at zero until real work exists.
    expect(profile.cvAnalyzed).toBe(false);
    expect(byPhase.cv).toBe(0);
    expect(byPhase.networking).toBe(0);
    expect(byPhase.interview).toBe(0);
  });

  it('never clobbers a direction the student already built in the wizard', () => {
    usePfStore.setState({ dirRole: 'Backend', dirIndustry: 'Dev Tools', dirSize: 'Big Tech' }, false);
    completeOnboarding();
    const s = usePfStore.getState();
    expect(s.dirRole).toBe('Backend');
    expect(s.dirIndustry).toBe('Dev Tools');
    expect(s.dirSize).toBe('Big Tech');
  });

  it('leaves the role blank for tracks the Direction wizard does not offer', () => {
    usePfStore.getState().setOnb({
      step: 3, role: 'Design', industry: 'Healthtech', stage: 'Big Tech',
      cv: 12, projects: 10, outreach: 8, cadence: 8,
    });
    usePfStore.getState().finishOnb();
    const s = usePfStore.getState();
    expect(s.dirRole).toBeNull();        // Design has no engineering-track equivalent
    expect(s.dirIndustry).toBe('Healthtech');
    expect(s.dirSize).toBe('Big Tech');
  });
});
