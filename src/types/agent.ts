export interface AgentStats {
  logic: number; // 1-10
  aggression: number;
  brevity: number;
  humor: number;
  boldness: number;
  creativity: number;
  knowledge: number;
  adaptability: number;
}

export const STAT_LABELS: Record<keyof AgentStats, { en: string; ko: string; emoji: string }> = {
  logic: { en: "Logic", ko: "논리", emoji: "🧠" },
  aggression: { en: "Aggression", ko: "공격", emoji: "⚔️" },
  brevity: { en: "Brevity", ko: "간결", emoji: "✂️" },
  humor: { en: "Humor", ko: "유머", emoji: "😄" },
  boldness: { en: "Boldness", ko: "대담", emoji: "🔥" },
  creativity: { en: "Creativity", ko: "창의", emoji: "🎨" },
  knowledge: { en: "Knowledge", ko: "지식", emoji: "📚" },
  adaptability: { en: "Adaptability", ko: "적응", emoji: "🌊" },
};

export const STAT_KEYS = Object.keys(STAT_LABELS) as (keyof AgentStats)[];

export const SPECIALTIES = [
  "politics",
  "technology",
  "philosophy",
  "science",
  "economics",
  "culture",
  "ethics",
  "history",
  "psychology",
  "environment",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const SPECIALTY_LABELS: Record<Specialty, { en: string; emoji: string }> = {
  politics: { en: "Politics", emoji: "🏛️" },
  technology: { en: "Technology", emoji: "💻" },
  philosophy: { en: "Philosophy", emoji: "🤔" },
  science: { en: "Science", emoji: "🔬" },
  economics: { en: "Economics", emoji: "📈" },
  culture: { en: "Culture", emoji: "🎭" },
  ethics: { en: "Ethics", emoji: "⚖️" },
  history: { en: "History", emoji: "📜" },
  psychology: { en: "Psychology", emoji: "🧩" },
  environment: { en: "Environment", emoji: "🌍" },
};

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
  // Stats stored as stat_* columns in DB
  stats: AgentStats;
  specialties: Specialty[];
  traits: Record<string, number>;
  manual_overrides: Record<string, number>;
  elo: number;
  wins: number;
  losses: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Presets from P013
export interface AgentPreset {
  name: string;
  description: string;
  emoji: string;
  stats: AgentStats;
  specialties: Specialty[];
}

export const PRESETS: AgentPreset[] = [
  {
    name: "The Logician",
    description: "Cold, precise, data-driven debater",
    emoji: "🧊",
    stats: { logic: 9, aggression: 3, brevity: 7, humor: 2, boldness: 4, creativity: 5, knowledge: 8, adaptability: 4 },
    specialties: ["science", "philosophy"],
  },
  {
    name: "The Firebrand",
    description: "Aggressive, bold, emotionally charged",
    emoji: "🔥",
    stats: { logic: 5, aggression: 9, brevity: 4, humor: 6, boldness: 9, creativity: 7, knowledge: 5, adaptability: 5 },
    specialties: ["politics", "culture"],
  },
  {
    name: "The Diplomat",
    description: "Balanced, adaptive, persuasive communicator",
    emoji: "🕊️",
    stats: { logic: 7, aggression: 3, brevity: 5, humor: 5, boldness: 5, creativity: 6, knowledge: 7, adaptability: 9 },
    specialties: ["ethics", "psychology"],
  },
  {
    name: "The Wildcard",
    description: "Unpredictable, creative, humor-driven",
    emoji: "🃏",
    stats: { logic: 4, aggression: 5, brevity: 6, humor: 9, boldness: 8, creativity: 9, knowledge: 4, adaptability: 7 },
    specialties: ["culture", "philosophy"],
  },
  {
    name: "The Scholar",
    description: "Knowledge-heavy, methodical, evidence-based",
    emoji: "📖",
    stats: { logic: 8, aggression: 2, brevity: 4, humor: 3, boldness: 3, creativity: 5, knowledge: 10, adaptability: 5 },
    specialties: ["history", "science", "economics"],
  },
];

// Convert DB row → Agent
export function dbToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    owner_id: row.owner_id as string,
    name: row.name as string,
    stats: {
      logic: row.stat_logic as number,
      aggression: row.stat_aggression as number,
      brevity: row.stat_brevity as number,
      humor: row.stat_humor as number,
      boldness: row.stat_boldness as number,
      creativity: row.stat_creativity as number,
      knowledge: row.stat_knowledge as number,
      adaptability: row.stat_adaptability as number,
    },
    specialties: (row.specialties as Specialty[]) ?? [],
    traits: (row.traits as Record<string, number>) ?? {},
    manual_overrides: (row.manual_overrides as Record<string, number>) ?? {},
    elo: row.elo as number,
    wins: row.wins as number,
    losses: row.losses as number,
    version: row.version as number,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// Convert Agent stats → DB columns for insert/update
export function statsToDB(stats: AgentStats) {
  return {
    stat_logic: stats.logic,
    stat_aggression: stats.aggression,
    stat_brevity: stats.brevity,
    stat_humor: stats.humor,
    stat_boldness: stats.boldness,
    stat_creativity: stats.creativity,
    stat_knowledge: stats.knowledge,
    stat_adaptability: stats.adaptability,
  };
}
