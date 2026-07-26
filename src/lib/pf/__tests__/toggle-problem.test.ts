import { describe, it, expect, beforeEach } from 'vitest';
import { usePfStore } from '../store';
import { LEETCODE_CATEGORIES } from '../leetcode';

/**
 * `ivSolved` is a projection of `ivProblems`, not a counter that gets
 * incremented. That distinction is what these tests protect.
 *
 * The old model incremented a per-category number, so the count and the work
 * behind it could drift apart and there was no way to correct a mis-tick. It
 * also carried counts logged against five categories that no longer exist —
 * recomputing every category on each toggle is what retires those instead of
 * silently adding them to the new totals.
 */

const arrays = LEETCODE_CATEGORIES[0];          // Arrays & Hashing, 8 problems
const twoPointers = LEETCODE_CATEGORIES[1];     // Two Pointers, 3 problems

beforeEach(() => {
  usePfStore.setState({ ivProblems: {}, ivSolved: {}, events: [] });
});

describe('toggleProblem', () => {
  it('marks a problem solved and counts it against its own category', () => {
    usePfStore.getState().toggleProblem(arrays.problems[0].slug);
    const s = usePfStore.getState();

    expect(s.ivProblems[arrays.problems[0].slug]).toBe(true);
    expect(s.ivSolved[arrays.name]).toBe(1);
    expect(s.ivSolved[twoPointers.name]).toBe(0);
  });

  it('un-ticks a problem, and the count follows it back down', () => {
    const slug = arrays.problems[0].slug;
    const toggle = usePfStore.getState().toggleProblem;

    toggle(slug);
    expect(usePfStore.getState().ivSolved[arrays.name]).toBe(1);

    toggle(slug);
    expect(usePfStore.getState().ivProblems[slug]).toBeUndefined();
    expect(usePfStore.getState().ivSolved[arrays.name]).toBe(0);
  });

  it('keeps the count equal to the ticked problems, never above the category size', () => {
    const toggle = usePfStore.getState().toggleProblem;
    arrays.problems.forEach((p) => toggle(p.slug));

    const s = usePfStore.getState();
    expect(s.ivSolved[arrays.name]).toBe(arrays.problems.length);
    expect(Object.keys(s.ivProblems)).toHaveLength(arrays.problems.length);
  });

  it('retires legacy counts logged against categories that no longer exist', () => {
    // A returning user whose progress was recorded against the invented list.
    usePfStore.setState({ ivSolved: { 'BFS / DFS': 7, 'Dynamic Programming': 4 }, ivProblems: {} });

    usePfStore.getState().toggleProblem(arrays.problems[0].slug);

    const s = usePfStore.getState();
    expect(s.ivSolved['BFS / DFS']).toBeUndefined();
    expect(s.ivSolved['Dynamic Programming']).toBeUndefined();
    expect(s.ivSolved[arrays.name]).toBe(1);
  });

  it('ignores an unknown slug instead of recording phantom progress', () => {
    usePfStore.getState().toggleProblem('not-a-real-problem');
    const s = usePfStore.getState();

    expect(s.ivProblems['not-a-real-problem']).toBeUndefined();
    expect(Object.keys(s.ivSolved)).toHaveLength(0);
    expect(s.events).toHaveLength(0);
  });

  it('logs an event for solving, but not for correcting a mis-tick', () => {
    const slug = arrays.problems[0].slug;
    const toggle = usePfStore.getState().toggleProblem;

    toggle(slug);
    expect(usePfStore.getState().events).toHaveLength(1);
    expect(usePfStore.getState().events[0].type).toBe('LeetCodeSolved');
    expect(usePfStore.getState().events[0].meta?.slug).toBe(slug);

    toggle(slug);
    expect(usePfStore.getState().events).toHaveLength(1);
  });
});
