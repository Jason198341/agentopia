import { create } from "zustand";

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
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ error: data.error ?? "Battle failed", loading: false });
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
