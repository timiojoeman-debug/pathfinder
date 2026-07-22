// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { verificationEmail, passwordResetEmail } from '../email';
import { logger } from '@/lib/logger';

/**
 * Email links used to fall straight back to localhost, so a deployment without
 * NEXT_PUBLIC_APP_URL set — which is how it shipped — mailed real users a
 * "reset your password" button pointing at http://localhost:3000. These tests
 * pin the resolution order that stops that happening silently.
 */

const VERCEL_KEYS = ['NEXT_PUBLIC_APP_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL'] as const;

describe('email link base URL', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    for (const k of VERCEL_KEYS) delete process.env[k];
    vi.stubEnv('NODE_ENV', 'test');
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('uses an explicit NEXT_PUBLIC_APP_URL, trimming a trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://pathfinder.example/';
    expect(verificationEmail('tok').html).toContain('https://pathfinder.example/verify-email?token=tok');
  });

  it('prefers the stable production domain over the per-deployment URL', () => {
    // Emails outlive any single deployment, so the stable domain must win.
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'pathfinder.vercel.app';
    process.env.VERCEL_URL = 'pathfinder-abc123.vercel.app';
    expect(passwordResetEmail('tok').html).toContain('https://pathfinder.vercel.app/reset-password?token=tok');
  });

  it('falls back to the per-deployment URL so preview builds still work', () => {
    process.env.VERCEL_URL = 'pathfinder-abc123.vercel.app';
    expect(passwordResetEmail('tok').html).toContain('https://pathfinder-abc123.vercel.app/reset-password?token=tok');
  });

  it('never silently ships localhost links in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const html = verificationEmail('tok').html;
    // The fallback still returns something usable, but it must be loud.
    expect(html).toContain('http://localhost:3000');
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/localhost in production/i));
  });

  it('uses localhost quietly in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(verificationEmail('tok').html).toContain('http://localhost:3000/verify-email?token=tok');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
