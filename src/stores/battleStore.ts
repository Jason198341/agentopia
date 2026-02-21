import { create } from "zustand";

const API_KEY_STORAGE = "agentopia_openai_key";

interface BattleState {
  loading: boolean;
  error: string | null;
  currentBattleId: string | null;

  startBattle: (agentId: string) => Promise<string | null>;
  reset: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  loading: false,
  error: null,
  currentBattleId: null,

  startBattle: async (agentId: string) => {
    set({ loading: true, error: null, currentBattleId: null });

    try {
      // Include BYOK key if available
      const apiKey = typeof window !== "undefined"
        ? localStorage.getItem(API_KEY_STORAGE)
        : null;

      const payload: Record<string, string> = { agent_id: agentId };
      if (apiKey) payload.api_key = apiKey;

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
