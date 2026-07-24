// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { envelopeMessage } from '@/lib/ai';

/**
 * Regression guard for a silent scoring bug.
 *
 * `/network/follow-up` and `/network/startup-outreach` post-process their
 * generated message through the naturalness checker, but read `message` off the
 * response root. `aiEnvelope` nests the payload under `data`, so the lookup
 * returned `undefined`, the checker scored an empty string, and every message
 * came back flawlessly natural — a confident score over no evidence, which is
 * the one thing this product is not allowed to ship.
 */

describe('envelopeMessage', () => {
  it('reads the message from under `data`, where aiEnvelope puts it', () => {
    expect(envelopeMessage({ data: { message: 'Hi Sam — saw your talk on pgvector.' } }))
      .toBe('Hi Sam — saw your talk on pgvector.');
  });

  it('still reads a root-level message, since aiShape routes answer there', () => {
    expect(envelopeMessage({ message: 'Root level' })).toBe('Root level');
  });

  it('prefers the nested message when both are present', () => {
    expect(envelopeMessage({ message: 'root', data: { message: 'nested' } })).toBe('nested');
  });

  it('supports a custom key for routes that name their payload differently', () => {
    expect(envelopeMessage({ data: { referralMessage: 'Please refer them.' } }, 'referralMessage'))
      .toBe('Please refer them.');
  });

  it('returns an empty string rather than throwing on junk input', () => {
    expect(envelopeMessage(null)).toBe('');
    expect(envelopeMessage(undefined)).toBe('');
    expect(envelopeMessage('a string')).toBe('');
    expect(envelopeMessage(42)).toBe('');
    expect(envelopeMessage([])).toBe('');
    expect(envelopeMessage({})).toBe('');
  });

  it('ignores a non-string message instead of coercing it', () => {
    expect(envelopeMessage({ data: { message: { text: 'nope' } } })).toBe('');
    expect(envelopeMessage({ data: { message: 12 } })).toBe('');
  });

  it('tolerates `data` being present but not an object', () => {
    expect(envelopeMessage({ data: 'oops', message: 'fallback' })).toBe('fallback');
    expect(envelopeMessage({ data: null, message: 'fallback' })).toBe('fallback');
  });
});
