import { z } from "zod";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { keepAlive, recordAiUsage } from "@/lib/db/ai-usage";

export type AIRequest = {
  systemPrompt: string;
  userPrompt: string;
  /** Cost-log label (e.g. "interview/random-problem"). Optional. */
  route?: string;
};

export type AIResponse = {
  content: string;
};

export class AIError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable: boolean,
    public available: boolean = true,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export function isAIAvailable(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY);
}

/**
 * Log one call's tokens to ai_usage, off the request path. The user id comes
 * from the x-user-id header the middleware stamps on authenticated requests, so
 * routes need no changes; outside a request scope headers() throws and the row
 * is simply recorded without a user. Never throws, never awaited.
 */
function trackUsage(model: string, data: { usage?: unknown }, route?: string, userId?: string | null) {
  // Read the header now, while the request scope is certainly live; the insert
  // itself runs in after() so the platform keeps the invocation alive for it.
  let uidP: Promise<string | null> = Promise.resolve(userId ?? null);
  if (!userId) {
    try { uidP = headers().then((h) => h.get("x-user-id"), () => null); } catch { /* no request scope */ }
  }
  keepAlive(async () => {
    await recordAiUsage({ userId: await uidP, route, model, usage: data?.usage as never });
  });
}

function handleOpenAIErrorResponse(res: Response, errText: string): never {
  const status = res.status;

  if (status === 401) {
    throw new AIError(
      "Invalid API key. Check your OPENAI_API_KEY in .env.local.",
      401,
      false,
      false
    );
  }

  if (status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    throw new AIError(
      "AI is busy. Please try again in a moment.",
      429,
      true,
      true,
      Number.isNaN(retryAfter) ? undefined : retryAfter
    );
  }

  if (status === 413 || errText.toLowerCase().includes("context length") || errText.toLowerCase().includes("maximum context") || errText.toLowerCase().includes("too many tokens")) {
    throw new AIError(
      "Input too long. Try with a shorter CV or job description.",
      status,
      false
    );
  }

  if (status === 500 || status === 503) {
    throw new AIError(
      "AI service temporarily unavailable. Please try again.",
      status,
      true
    );
  }

  throw new AIError(
    `OpenAI API error ${status}: ${errText}`,
    status,
    false
  );
}

async function callOpenAI(request: AIRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError(
      "No OpenAI API key configured. Set OPENAI_API_KEY in .env.local.",
      0,
      false,
      false
    );
  }

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Truncated: provider errors can echo the whole request payload back.
    logger.error("OpenAI API error", { status: res.status, error: errText.slice(0, 300) });
    handleOpenAIErrorResponse(res, errText);
  }

  const data = await res.json();
  trackUsage("gpt-4.1-mini", data, request.route);
  const content =
    data?.choices?.[0]?.message?.content ??
    (Array.isArray(data?.choices?.[0]?.message?.content)
      ? data.choices[0].message.content.map((p: { text?: string }) => p.text).join("\n")
      : "");
  return typeof content === "string" ? content : String(content);
}

export async function generateWithAI(request: AIRequest, fallback: () => string): Promise<AIResponse> {
  try {
    const aiContent = await callOpenAI(request);
    return { content: aiContent };
  } catch (err) {
    if (err instanceof AIError && !err.available) {
      // Key is misconfigured — rethrow so the problem isn't hidden by a fallback
      throw err;
    }
    // For other AIErrors (rate limit, server down) and unexpected errors, use fallback
    logger.error("OpenAI request failed, serving fallback", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { content: fallback() };
  }
}

/**
 * Call AI and parse JSON response. Strips markdown code fences.
 * Use with methodology-driven prompt builders for TechTalk-style output.
 */
export async function callAI<T = Record<string, unknown>>(
  params: { systemPrompt: string; userMessage: string; temperature?: number; route?: string; userId?: string | null },
  _isRetry = false,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError(
      "No OpenAI API key configured. Set OPENAI_API_KEY in .env.local.",
      0,
      false,
      false
    );
  }

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: params.temperature ?? 0.3,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    handleOpenAIErrorResponse(res, errText);
  }

  const data = await res.json();
  trackUsage("gpt-4.1-mini", data, params.route, params.userId);
  let content =
    data?.choices?.[0]?.message?.content ??
    (Array.isArray(data?.choices?.[0]?.message?.content)
      ? data.choices[0].message.content.map((p: { text?: string }) => p.text).join("\n")
      : "");
  content = typeof content === "string" ? content : String(content);

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch (firstErr) {
    // The model occasionally emits invalid JSON (bad escape inside a nested
    // string, an unterminated field). It's transient — same prompt, same input,
    // one retry almost always succeeds. Better than 500-ing the user. The
    // _isRetry guard prevents an infinite loop if the second attempt also fails.
    if (_isRetry) {
      throw new Error(
        `Failed to parse AI response as JSON after retry: ${firstErr instanceof Error ? firstErr.message : String(firstErr)}. Raw content: ${stripped.slice(0, 200)}...`,
      );
    }
    logger.warn("AI response was not valid JSON, retrying once", {
      error: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    return callAI<T>(params, true);
  }
}

/**
 * Like `callAI`, but validates the model's response against a Zod schema.
 *
 * `callAI<T>()` is a *compile-time* cast — nothing checks that the model
 * actually returned shape T. When it doesn't (a renamed key, a different
 * nesting level), routes that read `result.someField ?? fallback` silently
 * ship an empty payload: HTTP 200, no content, no error, no log. That failure
 * mode shipped three separate broken features before it was caught.
 *
 * Validating here converts a shape mismatch into a thrown AIError, so the
 * route's existing `catch` fires its real fallback *and* the mismatch is
 * logged instead of disappearing.
 */
export async function callAIValidated<T>(
  params: { systemPrompt: string; userMessage: string; temperature?: number; route?: string; userId?: string | null },
  schema: z.ZodType<T>,
  context?: string,
): Promise<T> {
  // `context` is already each route's label ("cv/ats-audit"), so it doubles as
  // the cost-log route without touching any route handler.
  const raw = await callAI<unknown>({ route: context, ...params });
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const issue = parsed.error.issues[0];
  const where = issue?.path?.length ? issue.path.map(String).join(".") : "(root)";
  throw new AIError(
    `AI response failed validation${context ? ` for ${context}` : ""} at "${where}": ${issue?.message ?? "unknown"}. ` +
      `Received keys: ${raw && typeof raw === "object" ? Object.keys(raw as object).join(", ") : typeof raw}`,
    502,
    true,
  );
}

/**
 * Schema for the standard methodology envelope: `{ inputQuality, feedback,
 * …, data: { … } }`. Most routes return the whole object to the client, so
 * unknown keys are preserved on purpose — only the `data` keys the route
 * actually depends on are asserted present and non-empty.
 *
 * Catches the real failure (the model dropped/renamed the payload) without
 * being brittle about optional extras it may or may not include on a run.
 */
/**
 * Validate the standard methodology envelope `{ …, data: { … } }` while
 * preserving every other top-level key (routes pass the whole object through).
 *
 * The `expectedDataKeys` argument is kept for documentation only — an earlier
 * version enforced "at least one key non-empty," which turned normal model
 * variance (partial content, empty strings for some fields) into hard 500s.
 * The value of validation here is **making routes read the right path** —
 * schemas force the correct `data.foo` access instead of a silent `??` on the
 * root. Beyond that, ship whatever data the model gave, empty fields and all,
 * so a shaky answer still renders instead of erroring.
 */
export function aiEnvelope(_expectedDataKeys: string[] = []) {
  void _expectedDataKeys;
  const isEmpty = (v: unknown) =>
    v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

  return z
    .object({ data: z.record(z.string(), z.unknown()) })
    .catchall(z.unknown())
    .superRefine((val, ctx) => {
      const data = val.data as Record<string, unknown>;
      // The one real failure: the model returned no payload at all — every
      // field of data is empty. Anything less is model variance, not a bug.
      if (Object.keys(data).length === 0 || Object.values(data).every(isEmpty)) {
        ctx.addIssue({
          code: "custom",
          path: ["data"],
          message: "`data` came back empty — no usable payload",
        });
      }
    });
}

/**
 * Tolerate the model nesting a payload under `data` or returning it at the
 * root. Observed live: the *same* prompt returned `{data:{criticalKeywords…}}`
 * for one route and `{criticalKeywords…}` for another on the same run, so
 * pinning either shape alone makes a working feature fail intermittently.
 *
 * Tries the schema at the root first, then unwraps `data` and retries.
 */
export function aiShape<T>(schema: z.ZodType<T>): z.ZodType<T> {
  return z.preprocess((v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if (!schema.safeParse(o).success && o.data && typeof o.data === "object") {
        return o.data;
      }
    }
    return v;
  }, schema) as unknown as z.ZodType<T>;
}

/**
 * Pull the generated message text out of an envelope response.
 *
 * The outreach routes post-process their message (the naturalness check) before
 * returning it. Reading `message` off the envelope root looks right and is
 * wrong — `aiEnvelope` nests the payload under `data`, so the root lookup
 * yielded `""` and every message was scored as flawlessly natural. Falls back
 * to the root anyway, because `aiShape` routes genuinely do answer there.
 */
export function envelopeMessage(result: unknown, key = "message"): string {
  if (!result || typeof result !== "object") return "";
  const root = result as Record<string, unknown>;
  const data = root.data;
  const nested = data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined;
  const value = nested ?? root[key];
  return typeof value === "string" ? value : "";
}
