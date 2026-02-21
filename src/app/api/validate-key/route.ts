import { NextResponse } from "next/server";

const OPENAI_URL = "https://api.openai.com/v1/models";

export async function POST(request: Request) {
  const { api_key } = await request.json();

  if (!api_key || typeof api_key !== "string" || !api_key.startsWith("sk-")) {
    return NextResponse.json(
      { valid: false, error: "Invalid key format. OpenAI keys start with sk-" },
      { status: 400 },
    );
  }

  try {
    // Lightweight check — list models endpoint (no cost)
    const res = await fetch(OPENAI_URL, {
      headers: { Authorization: `Bearer ${api_key}` },
    });

    if (res.ok) {
      return NextResponse.json({ valid: true });
    }

    const data = await res.json().catch(() => null);
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    return NextResponse.json({ valid: false, error: msg }, { status: 401 });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Network error during validation" },
      { status: 500 },
    );
  }
}
