// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));

import { retrieveRelevantMethodology, embedDocumentChunks } from "../retrieval";
import { createAdminClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

/** Stub the embeddings endpoint; `ok:false` exercises the failure path. */
function stubEmbedding(ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(ok ? JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }) : "err", {
        status: ok ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

function dbWithRpc(rpcData: unknown) {
  return { rpc: vi.fn(async () => ({ data: rpcData })), from: vi.fn() } as never;
}

describe("retrieveRelevantMethodology", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns the retrieved chunks formatted with their titles", async () => {
    stubEmbedding(true);
    vi.mocked(createAdminClient).mockReturnValue(dbWithRpc([
      { title: "Referral Ask Scripts", chunk_text: "Direct: ask plainly." },
      { title: "Follow-Up Cadence", chunk_text: "Thank-you within 24h." },
    ]));
    const out = await retrieveRelevantMethodology("referral", "how do I ask for a referral?");
    expect(out).toContain("[Referral Ask Scripts]");
    expect(out).toContain("Thank-you within 24h.");
  });

  it("returns an empty string when no chunks clear the threshold", async () => {
    stubEmbedding(true);
    vi.mocked(createAdminClient).mockReturnValue(dbWithRpc([]));
    expect(await retrieveRelevantMethodology("cv", "help")).toBe("");
  });

  it("falls back to an empty string when the embedding call fails", async () => {
    stubEmbedding(false);
    vi.mocked(createAdminClient).mockReturnValue(dbWithRpc([{ title: "x", chunk_text: "y" }]));
    expect(await retrieveRelevantMethodology("cv", "help")).toBe("");
  });

  it("falls back to an empty string when no API key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    expect(await retrieveRelevantMethodology("cv", "help")).toBe("");
  });
});

describe("embedDocumentChunks", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(logger.error).mockClear();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("embeds and upserts every methodology chunk", async () => {
    stubEmbedding(true);
    const rows: Record<string, unknown>[] = [];
    const upsert = vi.fn(async (row: Record<string, unknown>) => { rows.push(row); return { error: null }; });
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ upsert })) } as never);

    await embedDocumentChunks();

    // The corpus is a fixed set of chunks; each one is embedded and upserted.
    expect(rows.length).toBeGreaterThanOrEqual(15);
    expect(rows[0]).toHaveProperty("embedding");
    expect(rows[0]).toHaveProperty("chunk_text");
  });

  it("logs and continues when a chunk fails to embed", async () => {
    // No API key → getEmbedding throws for every chunk; the loop must not abort.
    delete process.env.OPENAI_API_KEY;
    const upsert = vi.fn(async () => ({ error: null }));
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ upsert })) } as never);

    await embedDocumentChunks();

    expect(upsert).not.toHaveBeenCalled();
    expect(vi.mocked(logger.error).mock.calls.length).toBeGreaterThanOrEqual(15);
  });
});
