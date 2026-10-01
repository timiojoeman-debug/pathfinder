import { describe, it, expect } from 'vitest';
import { cvStrengthLines, networkingProfileLine, studentProfileLine } from '../ai-context';
import type { CareerProfile } from '../profile';

/**
 * These lines are pasted straight into AI prompts, so anything invented here
 * becomes something the model states confidently about a real student. The
 * tests guard the one rule that matters: an unknown field is omitted, never
 * filled with a plausible-looking default.
 */

function makeProfile(overrides: Partial<CareerProfile> = {}): CareerProfile {
  return {
    targetRole: null, targetIndustry: null, companySize: null, workSetting: null,
    directionStatement: null, directionSet: false,
    currentSkills: [], missingSkills: [], targetKeywords: [],
    cvAnalyzed: false, cvHasContent: false, atsScore: null, atsHistory: [], atsDelta: null,
    projectsGenerated: false,
    targetCompanies: [], applicationsSubmitted: 0, interviewsLanded: 0, offers: 0, interviewRate: 0, schemeWindows: [],
    outreachSent: 0, contactedCompanies: [],
    leetSolved: 0, weakPatterns: [], interviewsLogged: 0,
    strengths: [], weaknesses: [], currentPhase: 'direction',
    events: [],
    ...overrides,
  };
}

describe('studentProfileLine', () => {
  it('falls back to a role-neutral description when no target role is set', () => {
    const line = studentProfileLine(makeProfile());
    expect(line).toBe('University student targeting software internships.');
  });

  it('omits skills and solved counts rather than inventing them', () => {
    const line = studentProfileLine(makeProfile({ targetRole: 'Backend Engineer' }));

    expect(line).toBe('Targeting Backend Engineer internships.');
    expect(line).not.toContain('Skills');
    expect(line).not.toContain('solved');
  });

  it('includes skills and solved count when they are real', () => {
    const line = studentProfileLine(
      makeProfile({ targetRole: 'Backend Engineer', currentSkills: ['Go', 'Postgres'], leetSolved: 12 }),
    );

    expect(line).toBe('Targeting Backend Engineer internships. Skills: Go, Postgres. 12 technical problems solved.');
  });

  it('caps the skill list so the sentence stays readable', () => {
    const skills = Array.from({ length: 14 }, (_, i) => `skill${i}`);
    const line = studentProfileLine(makeProfile({ currentSkills: skills }));

    expect(line).toContain('skill7');
    expect(line).not.toContain('skill8');
  });
});

describe('networkingProfileLine', () => {
  it('adds outreach volume and industry only when they exist', () => {
    const bare = networkingProfileLine(makeProfile({ targetRole: 'Backend Engineer' }));
    expect(bare).toBe('Targeting Backend Engineer internships.');

    const full = networkingProfileLine(
      makeProfile({ targetRole: 'Backend Engineer', outreachSent: 4, targetIndustry: 'Fintech' }),
    );
    expect(full).toBe('Targeting Backend Engineer internships. 4 outreach messages sent so far. Focused on Fintech.');
  });
});

describe('cvStrengthLines', () => {
  it('returns nothing when there is no evidence to draw on', () => {
    expect(cvStrengthLines(makeProfile())).toEqual([]);
  });

  it('never cites a target skill the CV does not evidence', () => {
    const lines = cvStrengthLines(makeProfile({ currentSkills: ['Go'], missingSkills: ['Kubernetes'] }));

    expect(lines.join(' ')).toContain('Go');
    expect(lines.join(' ')).not.toContain('Kubernetes');
  });

  it('reports the ATS score when one exists, including a low one', () => {
    expect(cvStrengthLines(makeProfile({ atsScore: 41 }))).toContain(
      'CV scores 41/100 against their target role',
    );
  });
});
