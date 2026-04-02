export type AIRequest = {
  systemPrompt: string;
  userPrompt: string;
};

export type AIResponse = {
  content: string;
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(request: AIRequest): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
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
      console.error("OpenAI error", await res.text());
      return null;
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      (Array.isArray(data?.choices?.[0]?.message?.content)
        ? data.choices[0].message.content.map((p: any) => p.text).join("\n")
        : "");
    return typeof content === "string" ? content : String(content);
  } catch (err) {
    console.error("OpenAI request failed", err);
    return null;
  }
}

export async function generateWithAI(request: AIRequest, fallback: () => string): Promise<AIResponse> {
  const aiContent = await callOpenAI(request);
  if (aiContent) {
    return { content: aiContent };
  }
  return { content: fallback() };
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
    throw new Error("OPENAI_API_KEY or NEXT_PUBLIC_OPENAI_API_KEY is not set");
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
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
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

