import { describe, it, expect } from 'vitest';
import { checkNaturalness } from '../naturalness-check';

describe('checkNaturalness', () => {
  it('flags text with multiple em-dashes', () => {
    const text = 'I built a project — it was great — the team loved it — we shipped it.';
    const result = checkNaturalness(text, { type: 'outreach' });
    const emDashIssues = result.issues.filter(i => i.type === 'em_dash');
    expect(emDashIssues.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it('flags overly formal language', () => {
    const text = 'I am writing to express my keen interest in the position at your company. I would be delighted to discuss further.';
    const result = checkNaturalness(text, { type: 'cover_letter' });
    const formalIssues = result.issues.filter(i => i.type === 'formal_language');
    expect(formalIssues.length).toBeGreaterThanOrEqual(2);
  });

  it('flags percentage not in whitelist', () => {
    const text = 'I improved team efficiency by 47% and reduced costs by 23%.';
    const result = checkNaturalness(text, { type: 'cover_letter', studentCvMetrics: [] });
    const metricIssues = result.issues.filter(i => i.type === 'fake_metric');
    expect(metricIssues.length).toBe(2);
  });

  it('does not flag whitelisted metrics', () => {
    const text = 'I improved efficiency by 47%.';
    const result = checkNaturalness(text, { type: 'cover_letter', studentCvMetrics: ['47%'] });
    const metricIssues = result.issues.filter(i => i.type === 'fake_metric');
    expect(metricIssues.length).toBe(0);
  });

  it('returns high score for clean natural text', () => {
    const text = 'Hi Sarah, I noticed your team at Stripe is hiring. I work with React and TypeScript and would love to chat about the role.';
    const result = checkNaturalness(text, { type: 'outreach' });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.verdict).toMatch(/natural|mostly_natural/);
  });

  it('flags US spelling when region is UK', () => {
    const text = 'I can help optimize your organization and analyze the results.';
    const result = checkNaturalness(text, { type: 'cover_letter', region: 'uk' });
    const spellingIssues = result.issues.filter(i => i.type === 'wrong_spelling_region');
    expect(spellingIssues.length).toBeGreaterThanOrEqual(2);
  });

  it('flags buzzwords', () => {
    const text = 'I want to leverage synergies and drive impactful outcomes in a dynamic environment.';
    const result = checkNaturalness(text, { type: 'cover_letter' });
    const buzzIssues = result.issues.filter(i => i.type === 'buzzword');
    expect(buzzIssues.length).toBeGreaterThanOrEqual(2);
  });

  it('flags outreach messages over 150 words', () => {
    const words = Array(160).fill('word').join(' ');
    const result = checkNaturalness(words, { type: 'outreach' });
    const lengthIssues = result.issues.filter(i => i.type === 'too_long');
    expect(lengthIssues.length).toBe(1);
  });

  it('flags cover letters over 350 words', () => {
    const words = Array(360).fill('word').join(' ');
    const result = checkNaturalness(words, { type: 'cover_letter' });
    const lengthIssues = result.issues.filter(i => i.type === 'too_long');
    expect(lengthIssues.length).toBe(1);
  });

  it('flags repetitive "I" sentence starts', () => {
    const text = 'I built a project. I learned React. I worked on APIs. I shipped the feature.';
    const result = checkNaturalness(text, { type: 'cover_letter' });
    const repIssues = result.issues.filter(i => i.type === 'repetitive_structure');
    expect(repIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('returns correct verdict categories', () => {
    // Heavily AI text
    const aiText = 'I am writing to express my keen interest. Furthermore, I would be delighted to leverage synergies — the dynamic environment — drives impactful outcomes — I am confident that this role represents a paradigm shift.';
    const result = checkNaturalness(aiText, { type: 'cover_letter' });
    expect(['needs_editing', 'heavily_ai']).toContain(result.verdict);
    expect(result.score).toBeLessThan(50);
  });
});
