// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

const after = vi.fn();
vi.mock('next/server', () => ({ after: (fn: () => Promise<void>) => after(fn) }));
vi.mock('@/lib/supabase/client', () => ({ getServerDb: vi.fn(() => null) }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { keepAlive } from '@/lib/db/ai-usage';

describe('keepAlive', () => {
  it('schedules the task via after() when available, without running it inline', () => {
    const task = vi.fn(async () => {});
    keepAlive(task);
    expect(after).toHaveBeenCalledTimes(1);
    expect(task).not.toHaveBeenCalled();
  });

  it('falls back to running the task when after() throws outside a request scope', () => {
    after.mockImplementationOnce(() => { throw new Error('outside request scope'); });
    const task = vi.fn(async () => {});
    keepAlive(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
