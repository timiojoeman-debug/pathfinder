import { describe, it, expect } from 'vitest';
import {
  categoryOf,
  LEETCODE_CATEGORIES,
  LEETCODE_PROBLEMS,
  LEETCODE_TOTAL,
  LEET_ON_TRACK,
} from '../leetcode';

/**
 * This list replaced five invented categories and 55 invented problems, so the
 * point of these tests is that the data stays real: every entry resolves to an
 * actual LeetCode problem, and the derived totals cannot drift away from it.
 *
 * They also pin the shape of the list rather than its exact contents, so
 * refreshing it from the NeetCode manifest does not mean rewriting the suite.
 */

describe('LeetCode data', () => {
  it('has the 18 categories and 100 problems of the NeetCode list', () => {
    expect(LEETCODE_CATEGORIES).toHaveLength(18);
    expect(LEETCODE_TOTAL).toBe(100);
    expect(LEETCODE_PROBLEMS).toHaveLength(100);
  });

  it('derives the total from the categories, so the two cannot disagree', () => {
    const counted = LEETCODE_CATEGORIES.reduce((n, c) => n + c.problems.length, 0);
    expect(LEETCODE_TOTAL).toBe(counted);
  });

  it('keeps every slug unique, since the store keys progress by slug', () => {
    const slugs = LEETCODE_PROBLEMS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('points every problem at a real leetcode.com URL', () => {
    for (const p of LEETCODE_PROBLEMS) {
      expect(p.url, p.name).toMatch(/^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/?$/);
      expect(p.number, p.name).toBeGreaterThan(0);
      expect(p.name.trim(), p.slug).not.toBe('');
    }
  });

  it('uses only the three real difficulty levels', () => {
    const seen = new Set(LEETCODE_PROBLEMS.map((p) => p.difficulty));
    expect([...seen].sort()).toEqual(['Easy', 'Hard', 'Medium']);
  });

  it('keeps the uneven category sizes rather than padding them', () => {
    const sizes = LEETCODE_CATEGORIES.map((c) => c.problems.length);
    expect(Math.min(...sizes)).toBe(1);
    expect(Math.max(...sizes)).toBe(13);
  });
});

describe('LEET_ON_TRACK', () => {
  it('holds the 60% bar the old hardcoded 45-of-75 threshold represented', () => {
    expect(LEET_ON_TRACK).toBe(60);
    expect(LEET_ON_TRACK / LEETCODE_TOTAL).toBeCloseTo(0.6, 5);
  });
});

describe('categoryOf', () => {
  it('resolves a known slug to its category', () => {
    const first = LEETCODE_CATEGORIES[0];
    expect(categoryOf(first.problems[0].slug)).toBe(first.name);
  });

  it('returns null for an unknown slug rather than guessing', () => {
    expect(categoryOf('not-a-real-problem')).toBeNull();
    expect(categoryOf('')).toBeNull();
  });

  it('agrees with the category each problem is actually listed under', () => {
    for (const c of LEETCODE_CATEGORIES) {
      for (const p of c.problems) {
        expect(categoryOf(p.slug), p.slug).toBe(c.name);
      }
    }
  });
});
