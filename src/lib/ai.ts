const FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const FIREWORKS_MODEL = "accounts/fireworks/models/deepseek-v3p1";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

// ─── Key Rotation: round-robin across up to 7 Fireworks keys ───

function getApiKeys(): string[] {
  const keys = [
    process.env.FIREWORKS_API_KEY,
    process.env.FIREWORKS_API_KEY_2,
    process.env.FIREWORKS_API_KEY_3,
    process.env.FIREWORKS_API_KEY_4,
    process.env.FIREWORKS_API_KEY_5,
    process.env.FIREWORKS_API_KEY_6,
    process.env.FIREWORKS_API_KEY_7,
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error("No FIREWORKS_API_KEY configured");
  return keys;
}

let callCounter = 0;

function nextApiKey(): string {
  const keys = getApiKeys();
  const key = keys[callCounter % keys.length];
  callCounter++;
  return key;
}

// ─── Types ───

export interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  content: string;
  tokens_used: number;
}

/** Generic completion function signature — used by battle engine */
export type CompletionFn = (opts: CompletionOptions) => Promise<CompletionResult>;

// ─── Fireworks (free tier, server-paid) ───

export async function fireworksCompletion({
  systemPrompt,
  userPrompt,
  maxTokens = 500,
  temperature = 0.7,
}: CompletionOptions): Promise<CompletionResult> {
  const apiKey = nextApiKey();

  const res = await fetch(FIREWORKS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: FIREWORKS_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fireworks API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content?.trim() ?? "",
    tokens_used: data.usage?.total_tokens ?? 0,
  };
}

// ─── OpenAI (BYOK — user's key, never stored) ───

export function createOpenAICompletion(userApiKey: string): CompletionFn {
  return async ({ systemPrompt, userPrompt, maxTokens = 500, temperature = 0.7 }) => {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content?.trim() ?? "",
      tokens_used: data.usage?.total_tokens ?? 0,
    };
  };
}
