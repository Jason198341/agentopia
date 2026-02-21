import type { Agent } from "./agent";

// Turn sequence: each turn has a type and number
export const TURN_SEQUENCE = [
  { turn: 1, type: "opening" },
  { turn: 2, type: "rebuttal" },
  { turn: 3, type: "counter" },
  { turn: 4, type: "free" },
  { turn: 5, type: "closing" },
] as const;

export type TurnType = (typeof TURN_SEQUENCE)[number]["type"];

export interface BattleScore {
  logic: number; // 0-20
  rebuttal: number;
  consistency: number;
  persuasion: number;
  expression: number;
  total: number; // 0-100
}

export interface Battle {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  topic: string;
  topic_category: string;
  status: "pending" | "in_progress" | "completed" | "aborted";
  winner_id: string | null;
  score_a: BattleScore | null;
  score_b: BattleScore | null;
  spectator_votes_a: number;
  spectator_votes_b: number;
  elo_change_a: number;
  elo_change_b: number;
  model_tier: "free" | "premium";
  created_at: string;
  completed_at: string | null;
}

export interface BattleTurn {
  id: string;
  battle_id: string;
  turn_number: number;
  agent_id: string;
  role: "pro" | "con";
  content: string;
  turn_type: TurnType;
  tokens_used: number;
  created_at: string;
}

// Extended types for UI (join agent data)
export interface BattleWithAgents extends Battle {
  agent_a: Agent;
  agent_b: Agent;
}

export interface BattleResult {
  battle_id: string;
  turns: BattleTurn[];
  score_a: BattleScore;
  score_b: BattleScore;
  winner_id: string | null;
  elo_change_a: number;
  elo_change_b: number;
}

// DB row → Battle
export function dbToBattle(row: Record<string, unknown>): Battle {
  return {
    id: row.id as string,
    agent_a_id: row.agent_a_id as string,
    agent_b_id: row.agent_b_id as string,
    topic: row.topic as string,
    topic_category: row.topic_category as string,
    status: row.status as Battle["status"],
    winner_id: (row.winner_id as string) ?? null,
    score_a: (row.score_a as BattleScore) ?? null,
    score_b: (row.score_b as BattleScore) ?? null,
    spectator_votes_a: (row.spectator_votes_a as number) ?? 0,
    spectator_votes_b: (row.spectator_votes_b as number) ?? 0,
    elo_change_a: (row.elo_change_a as number) ?? 0,
    elo_change_b: (row.elo_change_b as number) ?? 0,
    model_tier: (row.model_tier as Battle["model_tier"]) ?? "free",
    created_at: row.created_at as string,
    completed_at: (row.completed_at as string) ?? null,
  };
}

// DB row → BattleTurn
export function dbToBattleTurn(row: Record<string, unknown>): BattleTurn {
  return {
    id: row.id as string,
    battle_id: row.battle_id as string,
    turn_number: row.turn_number as number,
    agent_id: row.agent_id as string,
    role: row.role as BattleTurn["role"],
    content: row.content as string,
    turn_type: row.turn_type as TurnType,
    tokens_used: (row.tokens_used as number) ?? 0,
    created_at: row.created_at as string,
  };
}
