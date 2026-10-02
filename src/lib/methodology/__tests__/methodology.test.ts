import { describe, it, expect } from 'vitest';
import { CV_BLUEPRINT } from '../cv-blueprint';
import { NETWORKING_STRATEGY } from '../networking';
import { COFFEE_CHAT } from '../coffee-chat';
import { FOUR_PILLARS } from '../four-pillars';
import { INTERVIEW_PREP } from '../interview-prep';

describe('CV Blueprint', () => {
  it('exports sectionOrder with 7 sections and a 6-section student order', () => {
    expect(CV_BLUEPRINT.sectionOrder).toHaveLength(7);
    expect(CV_BLUEPRINT.studentSectionOrder.map((s) => s.name)).toEqual(['Impact Summary', 'Core Skills', 'Education', 'Projects', 'Experience', 'Certifications']);
  });

  it('tailors in 10 minutes across headline, summary, skills and key achievements', () => {
    expect(CV_BLUEPRINT.tailoringProcess.targetMinutes).toBe(10);
    const total = CV_BLUEPRINT.tailoringProcess.steps.reduce((n, s) => n + s.timeMinutes, 0);
    expect(total).toBe(10);
    expect(CV_BLUEPRINT.tailoringProcess.steps).toHaveLength(4);
  });

  it('keeps a distinct student order, with Projects before Experience', () => {
    const names = CV_BLUEPRINT.studentSectionOrder.map((s) => s.name);
    expect(names.indexOf('Projects')).toBeLessThan(names.indexOf('Experience'));
    expect(names.indexOf('Education')).toBeLessThan(names.indexOf('Projects'));
  });

  it('has section order starting with Role Title', () => {
    expect(CV_BLUEPRINT.sectionOrder[0].position).toBe(1);
    expect(CV_BLUEPRINT.sectionOrder[0].name).toBe('Role Title');
  });

  it('each section has position, name, rule, and rationale', () => {
    for (const section of CV_BLUEPRINT.sectionOrder) {
      expect(section).toHaveProperty('position');
      expect(section).toHaveProperty('name');
      expect(section).toHaveProperty('rule');
      expect(section).toHaveProperty('rationale');
    }
  });

  it('exports vagueTerms with flagWords', () => {
    expect(Array.isArray(CV_BLUEPRINT.vagueTerms.flagWords)).toBe(true);
    expect(CV_BLUEPRINT.vagueTerms.flagWords.length).toBeGreaterThan(0);
    expect(CV_BLUEPRINT.vagueTerms.flagWords[0]).toHaveProperty('term');
    expect(CV_BLUEPRINT.vagueTerms.flagWords[0]).toHaveProperty('rewrite');
  });

  it('exports screening stages', () => {
    expect(CV_BLUEPRINT.screeningStages).toBeDefined();
    expect(Array.isArray(CV_BLUEPRINT.screeningStages)).toBe(true);
  });

  it('exports formatting rules', () => {
    expect(CV_BLUEPRINT.formattingRules).toBeDefined();
    expect(Array.isArray(CV_BLUEPRINT.formattingRules)).toBe(true);
  });
});

describe('Networking Strategy', () => {
  it('exports outreachVariants with 3 variants', () => {
    const variants = Object.keys(NETWORKING_STRATEGY.outreachVariants);
    expect(variants).toHaveLength(3);
  });

  it('each variant has name and leadWith', () => {
    for (const key of Object.keys(NETWORKING_STRATEGY.outreachVariants)) {
      const variant = (NETWORKING_STRATEGY.outreachVariants as Record<string, unknown>)[key];
      expect(variant).toHaveProperty('name');
      expect(variant).toHaveProperty('leadWith');
    }
  });

  it('exports target groups with 3 groups', () => {
    const groups = Object.keys(NETWORKING_STRATEGY.targetGroups);
    expect(groups.length).toBeGreaterThanOrEqual(3);
  });

  it('each target group has searchTitles and approach', () => {
    for (const key of Object.keys(NETWORKING_STRATEGY.targetGroups)) {
      const group = (NETWORKING_STRATEGY.targetGroups as Record<string, unknown>)[key];
      expect(group).toHaveProperty('searchTitles');
      expect(group).toHaveProperty('approach');
    }
  });
});

describe('Coffee Chat', () => {
  it('exports framework with preparation and closing', () => {
    expect(COFFEE_CHAT.framework).toBeDefined();
    expect(COFFEE_CHAT.framework).toHaveProperty('preparation');
    expect(COFFEE_CHAT.framework).toHaveProperty('closing');
  });

  it('framework has opening with script', () => {
    expect(COFFEE_CHAT.framework.opening).toBeDefined();
    expect(COFFEE_CHAT.framework.opening).toHaveProperty('script');
  });

  it('exports question bank with 6 categories', () => {
    const categories = Object.keys(COFFEE_CHAT.questionBank);
    expect(categories.length).toBeGreaterThanOrEqual(6);
  });

  it('each question bank category has questions', () => {
    for (const key of Object.keys(COFFEE_CHAT.questionBank)) {
      const questions = (COFFEE_CHAT.questionBank as Record<string, readonly unknown[]>)[key];
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    }
  });
});

describe('Four Pillars', () => {
  it('exports 4 pillars', () => {
    expect(FOUR_PILLARS.pillars).toHaveLength(4);
  });

  it('each pillar has name, meaning, and timeAllocation', () => {
    for (const pillar of FOUR_PILLARS.pillars) {
      expect(pillar).toHaveProperty('name');
      expect(pillar).toHaveProperty('meaning');
      expect(pillar).toHaveProperty('timeAllocation');
    }
  });

  it('exports friday review', () => {
    expect(FOUR_PILLARS.fridayReview).toBeDefined();
    expect(FOUR_PILLARS.fridayReview.questions).toBeDefined();
    expect(Array.isArray(FOUR_PILLARS.fridayReview.questions)).toBe(true);
  });
});

describe('Interview Prep', () => {
  it('exports STAR methodology', () => {
    expect(INTERVIEW_PREP.star).toBeDefined();
  });

  it('uses STARL: an optional Learnings beat, no 20-second cap, no 10-minute format', () => {
    expect(INTERVIEW_PREP.star.learnings.rule).toMatch(/differently/);
    expect(INTERVIEW_PREP.star.result.rule).toMatch(/where you can/);
    expect(INTERVIEW_PREP.star.situation.common_mistake).not.toMatch(/20 seconds/);
    expect(INTERVIEW_PREP.practiceTimings).not.toHaveProperty('extended');
  });

  it('exports story categories', () => {
    expect(INTERVIEW_PREP.storyCategories).toBeDefined();
    expect(Array.isArray(INTERVIEW_PREP.storyCategories)).toBe(true);
    expect(INTERVIEW_PREP.storyCategories.length).toBe(5);
  });
});
