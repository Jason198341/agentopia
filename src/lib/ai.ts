const FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const FIREWORKS_MODEL = "accounts/fireworks/models/deepseek-v3p1";

// ─── Key Rotation: round-robin across up to 7 keys ───

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

// ─── Completion ───

interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface CompletionResult {
  content: string;
  tokens_used: number;
}

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
