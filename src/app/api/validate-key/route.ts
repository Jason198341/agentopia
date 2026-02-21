import { NextResponse } from "next/server";
import type { Provider } from "@/lib/ai";

export async function POST(request: Request) {
  const { api_key, provider = "openai" } = (await request.json()) as {
    api_key?: string;
    provider?: Provider;
  };

  if (!api_key || typeof api_key !== "string" || api_key.trim().length < 10) {
    return NextResponse.json(
      { valid: false, error: "API 키가 너무 짧습니다." },
      { status: 400 },
    );
  }

  const key = api_key.trim();

  try {
    switch (provider) {
      case "openai":
        return await validateOpenAI(key);
      case "claude":
        return await validateClaude(key);
      case "gemini":
        return await validateGemini(key);
      default:
        return NextResponse.json(
          { valid: false, error: `Unknown provider: ${provider}` },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json(
      { valid: false, error: "네트워크 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// OpenAI: GET /v1/models (free, no cost)
async function validateOpenAI(key: string) {
  if (!key.startsWith("sk-")) {
    return NextResponse.json(
      { valid: false, error: "OpenAI 키는 sk-로 시작해야 합니다." },
      { status: 400 },
    );
  }

  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (res.ok) return NextResponse.json({ valid: true });

  const data = await res.json().catch(() => null);
  return NextResponse.json(
    { valid: false, error: data?.error?.message ?? `HTTP ${res.status}` },
    { status: 401 },
  );
}

// Claude: GET /v1/models (free endpoint)
async function validateClaude(key: string) {
  if (!key.startsWith("sk-ant-")) {
    return NextResponse.json(
      { valid: false, error: "Anthropic 키는 sk-ant-로 시작해야 합니다." },
      { status: 400 },
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
  });

  if (res.ok) return NextResponse.json({ valid: true });

  const data = await res.json().catch(() => null);
  return NextResponse.json(
    { valid: false, error: data?.error?.message ?? `HTTP ${res.status}` },
    { status: 401 },
  );
}

// Gemini: GET /v1beta/models (free endpoint)
async function validateGemini(key: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
  );

  if (res.ok) return NextResponse.json({ valid: true });

  const data = await res.json().catch(() => null);
  const msg = data?.error?.message ?? `HTTP ${res.status}`;
  return NextResponse.json({ valid: false, error: msg }, { status: 401 });
}
