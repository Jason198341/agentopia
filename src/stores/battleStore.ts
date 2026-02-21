import { create } from "zustand";
import type { Provider } from "@/lib/providers";

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

    try {
      const byok = getByokConfig();
      const payload: Record<string, string> = { agent_id: agentId };
      if (byok) {
        payload.api_key = byok.api_key;
        payload.provider = byok.provider;
        if (byok.model) payload.model = byok.model;
      }

      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.error === "FREE_BATTLES_EXHAUSTED"
            ? "무료 배틀을 모두 사용했습니다. 설정에서 API 키를 등록하면 무제한으로 플레이할 수 있어요!"
            : data.error ?? "Battle failed";
        set({ error: msg, loading: false });
        return null;
      }

      set({ currentBattleId: data.battle_id, loading: false });
      return data.battle_id;
    } catch {
      set({ error: "Network error. Please try again.", loading: false });
      return null;
    }
  },

  reset: () => set({ loading: false, error: null, currentBattleId: null }),
}));
