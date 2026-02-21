import { DEFAULT_MODELS } from "./providers";
import type { Provider } from "./providers";

export type { Provider } from "./providers";
export { PROVIDER_CONFIG, DEFAULT_MODELS } from "./providers";

const FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const FIREWORKS_MODEL = "accounts/fireworks/models/deepseek-v3p1";

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

// ─── OpenAI (BYOK) ───

export function createOpenAICompletion(userApiKey: string, model?: string): CompletionFn {
  return async ({ systemPrompt, userPrompt, maxTokens = 500, temperature = 0.7 }) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userApiKey}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODELS.openai,
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

// ─── Claude / Anthropic (BYOK) ───

export function createClaudeCompletion(userApiKey: string, model?: string): CompletionFn {
  return async ({ systemPrompt, userPrompt, maxTokens = 500, temperature = 0.7 }) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": userApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODELS.claude,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return {
      content: data.content?.[0]?.text?.trim() ?? "",
      tokens_used: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    };
  };
}

// ─── Google Gemini (BYOK) ───

export function createGeminiCompletion(userApiKey: string, model?: string): CompletionFn {
  const modelId = model || DEFAULT_MODELS.gemini;

  return async ({ systemPrompt, userPrompt, maxTokens = 500, temperature = 0.7 }) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${userApiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "",
      tokens_used:
        (data.usageMetadata?.promptTokenCount ?? 0) +
        (data.usageMetadata?.candidatesTokenCount ?? 0),
    };
  };
}

// ─── Factory: create CompletionFn from provider + key + model ───

export function createCompletionFn(provider: Provider, apiKey: string, model?: string): CompletionFn {
  switch (provider) {
    case "openai":
      return createOpenAICompletion(apiKey, model);
    case "claude":
      return createClaudeCompletion(apiKey, model);
    case "gemini":
      return createGeminiCompletion(apiKey, model);
  }
}
