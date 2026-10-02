// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/client", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  captureException: vi.fn(),
}));
// The knowledge layer is pure and separately tested — pin it to a constant so
// these tests assert the engine's own behaviour, not the corpus.
vi.mock("@/lib/knowledge", () => ({ renderKnowledgeBlock: vi.fn(() => "[Knowledge] cite TechTalk") }));

import { buildUserContext, runMentorEngine, runMentorLocal } from "../mentor-engine";
import { createAdminClient } from "@/lib/supabase/client";

/**
 * The mentor engine builds a UserContext from Supabase, composes a methodology
 * prompt, calls gpt-4o, normalises the response and stores the interaction.
 * These tests drive buildUserContext against populated and empty data, and the
 * two entry points (runMentorEngine, runMentorLocal) across success, missing
 * fields, parse failure and the no-key error.
 */

/** Route embeddings vs chat completions to the shape each expects. */
function stubOpenAI(chat: unknown, chatStatus = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/embeddings")) {
        return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      const body = chatStatus === 200 ? JSON.stringify({ choices: [{ message: { content: typeof chat === "string" ? chat : JSON.stringify(chat) } }] }) : "err";
      return new Response(body, { status: chatStatus, headers: { "Content-Type": "application/json" } });
    }),
  );
}

const MENTOR_JSON = {
  inputQuality: "strong_input",
  inputQualityExplanation: "Detailed and specific.",
  methodologyReference: "TechTalk CV Blueprint",
  score: 72,
  feedback: [{ issue: "Quantify your bullets" }],
  strengths: ["Ships real projects"],
};

describe("buildUserContext", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("maps populated rows into a normalised context", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({
        profiles: { data: { direction_statement: "Backend in fintech", direction_score: 80, career_preferences: { role: "Backend", industry: "fintech", techStack: ["Go"], location: "London" }, cv_analysis_history: [], user_phase: "applying" } },
        cvs: { data: { parsed_data: { skills: ["Go", "Postgres"], projects: [{ tech: ["Docker"] }], experience: [{}] }, analysis_results: { overallScore: 71 } } },
        applications: { data: [
          { status: "applied", company: "Monzo", applied_date: new Date().toISOString() },
          { status: "rejected", company: "Stripe", rejection_timing: "Within hours" },
        ] },
        networking_contacts: { data: [{ message_text: "hi", follow_up_due: future }] },
        coffee_chat_notes: { data: [{}] },
        interview_stories: { data: [{ category: "conflict" }] },
        leetcode_progress: { data: [{ status: "solved" }, { status: "attempted" }] },
      }).db as never,
    );

    const ctx = await buildUserContext("u1");
    expect(ctx.direction.statement).toBe("Backend in fintech");
    expect(ctx.direction.role).toBe("Backend");
    expect(ctx.applications.total).toBe(2);
    expect(ctx.applications.statuses.applied).toBe(1);
    expect(ctx.applications.statuses.rejected).toBe(1);
    expect(ctx.applications.companies).toContain("Monzo");
    expect(ctx.applications.recentRejectionTimings).toEqual(["Within hours"]);
    expect(ctx.networking.contactsCount).toBe(1);
    expect(ctx.networking.messagesSent).toBe(1);
    expect(ctx.networking.activeFollowUps).toBe(1);
    expect(ctx.interviewPrep.storiesCount).toBe(1);
    expect(ctx.interviewPrep.leetcodeProgress).toEqual({ total: 2, solved: 1 });
    expect(ctx.cv.score).toBe(71);
    expect(ctx.skills.detected).toEqual(["Go", "Postgres"]);
    expect(ctx.skills.strongest).toContain("Docker");
    expect(ctx.phase).toBe("applying");
  });

  it("falls back to the synced client snapshot when the per-domain tables are empty", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseMock({
        profiles: { data: { direction_statement: null, career_preferences: {}, cv_analysis_history: [], user_phase: "applying", client_state: {
          dirRole: "Backend", dirIndustry: "Fintech", dirStack: ["Go"],
          board: [{ id: "applied", cards: [{ key: "m", company: "Monzo", appliedDate: Date.now() }] }],
          events: [{ type: "CoffeeChatCompleted", meta: { contact: "Sam" } }],
          savedStories: [{}], ivProblems: { "two-sum": true },
        } } },
      }).db as never,
    );
    const ctx = await buildUserContext("u1");
    expect(ctx.direction.role).toBe("Backend");
    expect(ctx.direction.techStack).toEqual(["Go"]);
    expect(ctx.applications.total).toBe(1);
    expect(ctx.applications.statuses.applied).toBe(1);
    expect(ctx.applications.companies).toEqual(["Monzo"]);
    expect(ctx.networking.coffeeChatsDone).toBe(1);
    expect(ctx.interviewPrep.storiesCount).toBe(1);
    expect(ctx.interviewPrep.leetcodeProgress.solved).toBe(1);
  });

  it("returns safe defaults when the student has no data", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({}).db as never);
    const ctx = await buildUserContext("u1");
    expect(ctx.direction.statement).toBeNull();
    expect(ctx.applications.total).toBe(0);
    expect(ctx.phase).toBe("new");
    expect(ctx.cv.parsed).toBeNull();
  });
});

describe("runMentorEngine", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    // storeInteraction / getPreviousInteractions hit ai_interactions.
    vi.mocked(createAdminClient).mockReturnValue(makeSupabaseMock({ ai_interactions: { data: [], error: null } }).db as never);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns the parsed, normalised mentor response (skipContext, static feature)", async () => {
    stubOpenAI(MENTOR_JSON);
    const res = await runMentorEngine({ userId: "u1", feature: "cv-analysis", featurePrompt: "Analyse the CV.", userMessage: "Here is my CV...", skipContext: true });
    expect(res.inputQuality).toBe("strong_input");
    expect(res.methodologyReference).toBe("TechTalk CV Blueprint");
    expect(res.score).toBe(72);
    expect(res.feedback).toHaveLength(1);
  });

  it("fills required fields with defaults when the model omits them", async () => {
    stubOpenAI({});
    const res = await runMentorEngine({ userId: "u1", feature: "cv-analysis", featurePrompt: "p", userMessage: "m", skipContext: true });
    expect(res.inputQuality).toBe("decent_attempt");
    expect(res.methodologyReference).toBe("TechTalk Methodology");
    expect(res.shouldRepeatAnalysis).toBe(false);
    expect(res.feedback).toEqual([]);
  });

  it("builds full context and returns a response when skipContext is false", async () => {
    stubOpenAI(MENTOR_JSON);
    const res = await runMentorEngine({ userId: "u1", feature: "cv-analysis", featurePrompt: "p", userMessage: "m" });
    expect(res.methodologyReference).toBe("TechTalk CV Blueprint");
  });

  it("throws when the model returns unparseable content", async () => {
    stubOpenAI("not json at all");
    await expect(
      runMentorEngine({ userId: "u1", feature: "cv-analysis", featurePrompt: "p", userMessage: "m", skipContext: true }),
    ).rejects.toThrow(/Failed to parse/);
  });

  it("throws an AIError when no API key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    stubOpenAI(MENTOR_JSON);
    await expect(
      runMentorEngine({ userId: "u1", feature: "cv-analysis", featurePrompt: "p", userMessage: "m", skipContext: true }),
    ).rejects.toMatchObject({ name: "AIError" });
  });
});

describe("runMentorLocal", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  beforeEach(() => { process.env.OPENAI_API_KEY = "test-key"; vi.mocked(createAdminClient).mockClear(); });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns a normalised response without touching the database", async () => {
    stubOpenAI(MENTOR_JSON);
    const res = await runMentorLocal({ feature: "project-builder", featurePrompt: "p", userMessage: "m", context: { phase: "applying" } });
    expect(res.methodologyReference).toBe("TechTalk CV Blueprint");
    expect(res.strengths).toContain("Ships real projects");
    // No context build means createAdminClient is never called.
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("throws when the model output cannot be parsed", async () => {
    stubOpenAI("```not json```");
    await expect(
      runMentorLocal({ feature: "project-builder", featurePrompt: "p", userMessage: "m" }),
    ).rejects.toThrow(/Failed to parse/);
  });

  it("propagates an AIError when the model is rate-limited", async () => {
    stubOpenAI(null, 429);
    await expect(
      runMentorLocal({ feature: "project-builder", featurePrompt: "p", userMessage: "m" }),
    ).rejects.toMatchObject({ name: "AIError", status: 429 });
  });
});
