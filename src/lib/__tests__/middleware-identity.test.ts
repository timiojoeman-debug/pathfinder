// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

const FORGED = {
  'x-user-id': 'victim-id',
  'x-user-email': 'victim@example.com',
  'x-user-role': 'admin',
};

/** Forwarded request headers as Next encodes them on the middleware response. */
function forwarded(res: Response): string[] {
  return (res.headers.get('x-middleware-override-headers') ?? '').split(',');
}

function req(path: string, extra: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { ...FORGED, ...extra },
  });
}

function expectStripped(res: Response) {
  expect(res.status).toBe(200);
  const names = forwarded(res);
  for (const h of Object.keys(FORGED)) {
    expect(names).not.toContain(h);
    expect(res.headers.get(`x-middleware-request-${h}`)).toBeNull();
  }
}

describe('middleware identity headers', () => {
  it('strips a forged x-user-id on the guest path (no cookie)', async () => {
    expectStripped(await middleware(req('/api/jobs/search')));
  });

  it('strips it when an invalid token falls through to guest', async () => {
    process.env.JWT_SECRET = 'k'.repeat(40);
    expectStripped(
      await middleware(req('/api/jobs/search', { cookie: 'pathfinder-token=not-a-jwt' })),
    );
  });

  it('strips it on a public route', async () => {
    expectStripped(await middleware(req('/api/intel/analyze')));
  });
});
