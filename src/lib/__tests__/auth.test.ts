// @vitest-environment node
// jose checks `instanceof Uint8Array` on the signing key; jsdom's TextEncoder
// returns a cross-realm Uint8Array that fails that check, so run in Node where
// the crypto/jose primitives share a realm.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth';

/**
 * Security-critical: PBKDF2 password hashing and JWT session tokens. These are
 * the primitives the whole auth layer rests on, so a regression here is a
 * direct account-security bug.
 */

describe('password hashing (PBKDF2)', () => {
  it('produces a salt:hash pair and verifies the correct password', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/);
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const stored = await hashPassword('s3cret');
    expect(await verifyPassword('not s3cret', stored)).toBe(false);
  });

  it('is salted — the same password hashes to different values', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
    // ...but both still verify
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('returns false for a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-valid-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
  });
});

describe('JWT session tokens', () => {
  const original = process.env.JWT_SECRET;

  beforeEach(() => { process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-prod'; });
  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  const payload = { userId: 'user-123', email: 'a@b.com', role: 'student' };

  it('round-trips a payload through sign and verify', async () => {
    const token = await createToken(payload);
    expect(await verifyToken(token)).toEqual(payload);
  });

  it('returns null for a tampered or garbage token', async () => {
    const token = await createToken(payload);
    expect(await verifyToken(token + 'tampered')).toBeNull();
    expect(await verifyToken('not.a.jwt')).toBeNull();
  });

  it('will not verify a token signed with a different secret', async () => {
    const token = await createToken(payload);
    process.env.JWT_SECRET = 'a-completely-different-secret';
    expect(await verifyToken(token)).toBeNull();
  });

  it('throws when JWT_SECRET is not configured', async () => {
    delete process.env.JWT_SECRET;
    await expect(createToken(payload)).rejects.toThrow('JWT_SECRET');
  });
});
