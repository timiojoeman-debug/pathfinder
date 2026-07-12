// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client factory and silence the logger.
vi.mock('@/lib/supabase/client', () => ({
  getServerDb: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
  createAdminClient: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getServerDb } from '@/lib/supabase/client';
import {
  getApplications, getContacts, getCV, getInterviewLogs, storeInteraction,
} from '@/lib/db';

type ServerDb = ReturnType<typeof getServerDb>;

/** A chainable query-builder stub that resolves (thenable) to { data, error }. */
function makeDb(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit', 'single']) {
    builder[m] = vi.fn(() => builder);
  }
  // PromiseLike: awaiting the chain yields the result.
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  const from = vi.fn(() => builder);
  return { db: { from } as unknown as ServerDb, from, builder };
}

const useDb = (result: { data?: unknown; error?: unknown }) => {
  const h = makeDb(result);
  vi.mocked(getServerDb).mockReturnValue(h.db);
  return h;
};

beforeEach(() => vi.mocked(getServerDb).mockReset());

describe('db layer — local-first degradation (no Supabase configured)', () => {
  beforeEach(() => vi.mocked(getServerDb).mockReturnValue(null));

  it('list getters return an empty array', async () => {
    expect(await getApplications('u1')).toEqual([]);
    expect(await getContacts('u1')).toEqual([]);
    expect(await getInterviewLogs('u1')).toEqual([]);
  });

  it('single-row getter returns null', async () => {
    expect(await getCV('u1')).toBeNull();
  });

  it('writes report failure without throwing', async () => {
    expect(await storeInteraction('u1', {
      feature: 'cv', input_quality: 'good', methodology_applied: 'x',
      input_summary: 'a', output_summary: 'b', feedback_items_count: 0,
    })).toBe(false);
  });
});

describe('db layer — happy path returns rows and scopes by user', () => {
  it('getApplications returns data and filters by user_id', async () => {
    const h = useDb({ data: [{ id: 'a1' }], error: null });
    const rows = await getApplications('user-42');
    expect(rows).toEqual([{ id: 'a1' }]);
    expect(h.from).toHaveBeenCalledWith('applications');
    expect(h.builder.eq).toHaveBeenCalledWith('user_id', 'user-42');
  });

  it('getContacts queries the networking_contacts table', async () => {
    const h = useDb({ data: [{ id: 'c1' }], error: null });
    expect(await getContacts('user-1')).toEqual([{ id: 'c1' }]);
    expect(h.from).toHaveBeenCalledWith('networking_contacts');
  });

  it('getCV returns the single master row', async () => {
    const h = useDb({ data: { id: 'cv1', is_master: true }, error: null });
    expect(await getCV('user-1')).toEqual({ id: 'cv1', is_master: true });
    expect(h.builder.single).toHaveBeenCalled();
  });

  it('storeInteraction returns true on a successful insert', async () => {
    const h = useDb({ error: null });
    const ok = await storeInteraction('user-1', {
      feature: 'cv', input_quality: 'good', methodology_applied: 'x',
      input_summary: 'a', output_summary: 'b', feedback_items_count: 2,
    });
    expect(ok).toBe(true);
    expect(h.from).toHaveBeenCalledWith('ai_interactions');
    expect(h.builder.insert).toHaveBeenCalled();
  });
});

describe('db layer — a query error degrades to the safe default', () => {
  it('getApplications returns [] on a DB error instead of throwing', async () => {
    useDb({ data: null, error: { message: 'boom' } });
    await expect(getApplications('u1')).resolves.toEqual([]);
  });

  it('getCV returns null on a DB error', async () => {
    useDb({ data: null, error: { message: 'boom' } });
    expect(await getCV('u1')).toBeNull();
  });

  it('storeInteraction returns false on a DB error', async () => {
    useDb({ error: { message: 'boom' } });
    const ok = await storeInteraction('u1', {
      feature: 'cv', input_quality: 'good', methodology_applied: 'x',
      input_summary: 'a', output_summary: 'b', feedback_items_count: 0,
    });
    expect(ok).toBe(false);
  });
});
