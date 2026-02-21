import { createClient } from "@/lib/supabase/client";
import {
  type Agent,
  type AgentStats,
  type AgentPersonality,
  type Specialty,
  dbToAgent,
  statsToDB,
} from "@/types/agent";
import { create } from "zustand";

interface AgentState {
  agents: Agent[];
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  createAgent: (
    name: string,
    stats: AgentStats,
    specialties: Specialty[],
    personality?: AgentPersonality,
  ) => Promise<Agent | null>;
  updateAgent: (
    id: string,
    updates: { name?: string; stats?: AgentStats; specialties?: Specialty[]; personality?: AgentPersonality },
  ) => Promise<boolean>;
  deleteAgent: (id: string) => Promise<boolean>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    const supabase = createClient();

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("elo", { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({
      agents: (data ?? []).map(dbToAgent),
      loading: false,
    });
  },

  createAgent: async (name, stats, specialties, personality) => {
    set({ error: null });
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ error: "Not authenticated" });
      return null;
    }

    // Store personality in traits JSONB under _personality key
    const traits: Record<string, unknown> = {};
    if (personality && Object.keys(personality).length > 0) {
      traits._personality = personality;
    }

    const { data, error } = await supabase
      .from("agents")
      .insert({
        owner_id: user.id,
        name,
        ...statsToDB(stats),
        specialties,
        ...(Object.keys(traits).length > 0 ? { traits } : {}),
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message });
      return null;
    }

    const agent = dbToAgent(data);
    set({ agents: [agent, ...get().agents] });
    return agent;
  },

  updateAgent: async (id, updates) => {
    set({ error: null });
    const supabase = createClient();

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.stats) Object.assign(dbUpdates, statsToDB(updates.stats));
    if (updates.specialties) dbUpdates.specialties = updates.specialties;

    // Merge personality into existing traits JSONB
    if (updates.personality) {
      const existing = get().agents.find((a) => a.id === id);
      const currentTraits = existing?.traits ?? {};
      dbUpdates.traits = { ...currentTraits, _personality: updates.personality };
    }

    const { error } = await supabase
      .from("agents")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      set({ error: error.message });
      return false;
    }

    // Optimistic update
    set({
      agents: get().agents.map((a) => {
        if (a.id !== id) return a;
        const updatedTraits = updates.personality
          ? { ...a.traits, _personality: updates.personality }
          : a.traits;
        return {
          ...a,
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.stats ? { stats: updates.stats } : {}),
          ...(updates.specialties ? { specialties: updates.specialties } : {}),
          traits: updatedTraits,
        };
      }),
    });

    return true;
  },

  deleteAgent: async (id) => {
    set({ error: null });
    const supabase = createClient();

    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      set({ error: error.message });
      return false;
    }

    set({ agents: get().agents.filter((a) => a.id !== id) });
    return true;
  },
}));
