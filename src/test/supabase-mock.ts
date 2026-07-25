import { vi } from "vitest";

/**
 * A chainable Supabase query-builder stub for route-handler tests.
 *
 * Every builder method (`select`, `insert`, `upsert`, `eq`, `order`, `limit`,
 * `single`, …) returns the same builder, and awaiting the chain resolves to the
 * result configured for that table. This mirrors the real PostgREST client
 * closely enough for the routes, which only ever `await db.from(t)…`.
 *
 * Pass a result per table. A table may map to an **array** of results, which is
 * consumed one-per-`from()`-call — needed when a route queries the same table
 * twice with different expected outcomes (e.g. signup's existing-user check
 * then insert).
 */
export type QueryResult = { data?: unknown; error?: unknown };
type TableConfig = Record<string, QueryResult | QueryResult[]>;

const BUILDER_METHODS = ["select", "insert", "update", "delete", "upsert", "eq", "order", "limit", "single"] as const;

export function makeSupabaseMock(byTable: TableConfig = {}) {
  // Per-table cursors so array-configured tables advance across from() calls.
  const cursors: Record<string, number> = {};

  const from = vi.fn((table: string) => {
    const configured = byTable[table];
    let result: QueryResult;
    if (Array.isArray(configured)) {
      const i = cursors[table] ?? 0;
      result = configured[Math.min(i, configured.length - 1)] ?? { data: null, error: null };
      cursors[table] = i + 1;
    } else {
      result = configured ?? { data: null, error: null };
    }

    const builder: Record<string, unknown> = {};
    for (const m of BUILDER_METHODS) builder[m] = vi.fn(() => builder);
    // PromiseLike: awaiting the chain (with or without a terminal .single())
    // yields the configured result.
    builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return builder;
  });

  // The routes only ever touch `.from`; callers cast `.db` to the admin-client
  // type at the mock boundary, so a structural `{ from }` is all that's needed.
  return { from, db: { from } };
}
