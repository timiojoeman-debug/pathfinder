export type AIRequest = {
  systemPrompt: string;
  userPrompt: string;
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
    console.error("OpenAI error", errText);
    handleOpenAIErrorResponse(res, errText);
  }

  const data = await res.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    (Array.isArray(data?.choices?.[0]?.message?.content)
      ? data.choices[0].message.content.map((p: any) => p.text).join("\n")
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
    console.error("OpenAI request failed, using fallback", err);
    return { content: fallback() };
  }
}

/**
 * Call AI and parse JSON response. Strips markdown code fences.
 * Use with methodology-driven prompt builders for TechTalk-style output.
 */
export async function callAI<T = Record<string, unknown>>(params: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
}): Promise<T> {
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
  } catch (e) {
    throw new Error(
      `Failed to parse AI response as JSON: ${e instanceof Error ? e.message : String(e)}. Raw content: ${stripped.slice(0, 200)}...`
    );
  }
}
