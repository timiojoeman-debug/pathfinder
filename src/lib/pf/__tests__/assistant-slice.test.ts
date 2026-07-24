import { describe, it, expect, beforeEach } from 'vitest';
import { usePfStore } from '../store';

/**
 * The mentor assistant is advisory: it reads the profile and answers, and it
 * must not be able to change anything the profile is derived from.
 *
 * These tests pin that boundary at the store level, which is where it actually
 * has to hold. If a later change gives the assistant slice the ability to write
 * CV text, saved jobs, solved problems or events, every number in the product
 * becomes something a model can manufacture — and these tests should fail
 * loudly rather than letting that land quietly.
 */

const PRISTINE = {
  cvText: 'Real CV text',
  cvAnalyzed: true,
  savedJobs: [],
  ivProblems: {},
  ivSolved: {},
  netSent: 3,
  events: [],
};

beforeEach(() => {
  usePfStore.setState({ ...PRISTINE, asstOpen: false, asstMsgs: [], asstDraft: '' });
});

describe('assistant slice', () => {
  it('starts closed and empty', () => {
    const s = usePfStore.getState();
    expect(s.asstOpen).toBe(false);
    expect(s.asstMsgs).toEqual([]);
    expect(s.asstDraft).toBe('');
  });

  it('holds a conversation without touching anything the profile derives from', () => {
    const { set } = usePfStore.getState();

    set({ asstOpen: true, asstMsgs: [{ role: 'user', content: 'What should I do next?' }] });
    set({
      asstMsgs: [
        ...usePfStore.getState().asstMsgs,
        { role: 'assistant', content: 'Your CV is analysed; send some outreach next.' },
      ],
    });

    const s = usePfStore.getState();
    expect(s.asstMsgs).toHaveLength(2);

    // Everything the profile reads is untouched.
    expect(s.cvText).toBe(PRISTINE.cvText);
    expect(s.cvAnalyzed).toBe(true);
    expect(s.savedJobs).toEqual([]);
    expect(s.ivProblems).toEqual({});
    expect(s.ivSolved).toEqual({});
    expect(s.netSent).toBe(3);
  });

  it('records no events of its own — talking is not progress', () => {
    const { set } = usePfStore.getState();
    set({ asstMsgs: [{ role: 'user', content: 'Have I done enough networking?' }] });

    expect(usePfStore.getState().events).toHaveLength(0);
  });

  it('clears the conversation without clearing anything else', () => {
    const { set } = usePfStore.getState();
    set({ asstMsgs: [{ role: 'user', content: 'hello' }] });

    set({ asstMsgs: [] });

    const s = usePfStore.getState();
    expect(s.asstMsgs).toEqual([]);
    expect(s.cvText).toBe(PRISTINE.cvText);
    expect(s.netSent).toBe(3);
  });
});
