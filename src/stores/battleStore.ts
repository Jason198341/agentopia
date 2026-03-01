import { create } from "zustand";
import type { Provider } from "@/lib/providers";
import { checkDailyLimit, incrementDailyCount } from "@/lib/rate-limiter";
import { safeFetch, ApiError, NetworkError } from "@/lib/api-error";

const STORAGE_KEYS: Record<Provider, string> = {
  openai: "agentopia_openai_key",
  claude: "agentopia_claude_key",
  gemini: "agentopia_gemini_key",
};
const PROVIDER_STORAGE = "agentopia_provider";
const MODEL_STORAGE = "agentopia_model";

interface BattleState {
  loading: boolean;
  error: string | null;
  currentBattleId: string | null;

  startBattle: (agentId: string) => Promise<string | null>;
  reset: () => void;
}

/** Read the active BYOK config from localStorage */
function getByokConfig(): { api_key: string; provider: Provider; model: string } | null {
  if (typeof window === "undefined") return null;

  const provider = (localStorage.getItem(PROVIDER_STORAGE) || "openai") as Provider;
  const key = localStorage.getItem(STORAGE_KEYS[provider]);
  if (!key) {
    // Fallback: check all providers for any saved key
    for (const p of ["openai", "claude", "gemini"] as Provider[]) {
      const k = localStorage.getItem(STORAGE_KEYS[p]);
      if (k) {
        const model = localStorage.getItem(MODEL_STORAGE) || "";
        return { api_key: k, provider: p, model };
      }
    }
    return null;
  }

  const model = localStorage.getItem(MODEL_STORAGE) || "";
  return { api_key: key, provider, model };
}

export function hasAnyApiKey(): boolean {
  if (typeof window === "undefined") return false;
  return (["openai", "claude", "gemini"] as Provider[]).some(
    (p) => !!localStorage.getItem(STORAGE_KEYS[p]),
  );
}

export const useBattleStore = create<BattleState>((set) => ({
  loading: false,
  error: null,
  currentBattleId: null,

  startBattle: async (agentId: string) => {
    set({ loading: true, error: null, currentBattleId: null });

    const byok = getByokConfig();

    // Rate limit check: 1 free AI battle per day (client-side convenience guard).
    // BYOK users bypass this limit since they supply their own key.
    if (!byok) {
      const limit = checkDailyLimit("battle");
      if (!limit.allowed) {
        set({
          error: "일일 AI 사용 한도(1회)를 초과했습니다. 내일 다시 시도해주세요.",
          loading: false,
        });
        return null;
      }
    }

    const payload: Record<string, string> = { agent_id: agentId };
    if (byok) {
      payload.api_key = byok.api_key;
      payload.provider = byok.provider;
      if (byok.model) payload.model = byok.model;
    }

    let data: Record<string, unknown>;
    try {
      const res = await safeFetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = await res.json();
    } catch (err) {
      if (err instanceof NetworkError) {
        set({ error: err.message, loading: false });
      } else if (err instanceof ApiError) {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(err.message); } catch { /* raw text */ }
        const apiErr = (parsed.error as string) ?? err.message;
        const msg =
          apiErr === "FREE_BATTLES_EXHAUSTED"
            ? "무료 배틀을 모두 사용했습니다. 설정에서 API 키를 등록하면 무제한으로 플레이할 수 있어요!"
            : apiErr;
        set({ error: msg, loading: false });
      } else {
        set({ error: "알 수 없는 오류가 발생했습니다.", loading: false });
      }
      return null;
    }

    // Increment daily counter after a successful free battle
    if (!byok) {
      incrementDailyCount("battle");
    }

    set({ currentBattleId: data.battle_id as string, loading: false });
    return data.battle_id as string;
  },

  reset: () => set({ loading: false, error: null, currentBattleId: null }),
}));
