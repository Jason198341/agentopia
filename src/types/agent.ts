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

/** Maximum total stat points allowed. Avg 7 per stat — forces tradeoffs. */
export const STAT_BUDGET = 56;

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

// ─── Personality System: "how" the agent debates (text/presets) ───

export const SPEAKING_STYLES = [
  { id: "socratic", label: "Socratic Questioning", emoji: "🏛️", prompt: "Use the Socratic method — ask probing questions that expose contradictions in the opponent's reasoning. Guide the audience to your conclusion through questions, not declarations." },
  { id: "courtroom", label: "Courtroom Attorney", emoji: "⚖️", prompt: "Argue like a trial lawyer. Present evidence methodically, cross-examine the opponent's claims, and build an airtight case. Use phrases like 'the evidence shows' and 'I put it to you that'." },
  { id: "ted-talk", label: "TED Talk Speaker", emoji: "🎤", prompt: "Speak like a TED presenter. Open with a compelling story or surprising fact. Build to a clear thesis. Use pauses for effect. Make complex ideas accessible and inspiring." },
  { id: "comedian", label: "Stand-up Comedian", emoji: "🎭", prompt: "Debate like a stand-up comedian. Use callbacks, punchlines, and absurdist humor to make your points memorable. Roast bad arguments. Make the audience laugh their way to your side." },
  { id: "academic", label: "Academic Paper", emoji: "📝", prompt: "Write like an academic paper. Be precise, cite frameworks by name, use hedging language where appropriate ('evidence suggests'), and structure arguments with clear thesis-evidence-conclusion flow." },
] as const;

export const DEBATE_PHILOSOPHIES = [
  { id: "utilitarian", label: "Utilitarian", emoji: "📊", prompt: "Judge everything by outcomes and consequences. 'The greatest good for the greatest number' is your north star. Use cost-benefit analysis. Quantify impact when possible." },
  { id: "deontologist", label: "Deontologist", emoji: "📜", prompt: "Focus on principles, duties, and rights — not consequences. Some things are right or wrong regardless of outcomes. Invoke universal rules and moral imperatives." },
  { id: "pragmatist", label: "Pragmatist", emoji: "🔧", prompt: "Focus on what actually works in practice, not theory. Use real-world examples and case studies. Dismiss idealism in favor of implementable solutions." },
  { id: "contrarian", label: "Devil's Advocate", emoji: "😈", prompt: "Systematically challenge every assumption. If consensus says X, explore why X might be wrong. Find the strongest counterargument to the popular view and champion it." },
] as const;

export const STRATEGY_PATTERNS = [
  { id: "deconstruct", label: "Deconstruct Point-by-Point", emoji: "🔬", prompt: "Address each of your opponent's arguments individually. Quote them, then systematically dismantle each claim. Leave no argument unanswered." },
  { id: "big-picture", label: "Big Picture Dominance", emoji: "🌍", prompt: "Don't get bogged down in details. Zoom out to the meta-level. Frame the entire debate around the largest possible stakes. Make your opponent's points seem trivially small." },
  { id: "reverse", label: "Reverse Their Logic", emoji: "🔄", prompt: "Take your opponent's own premises, data, and logic — then show how they actually support YOUR position. Turn their strengths into evidence for your case." },
  { id: "narrative", label: "Storytelling & Emotion", emoji: "📖", prompt: "Build your argument around compelling stories, vivid scenarios, and emotional truths. Use 'imagine if' thought experiments. Make the audience feel your position, not just think it." },
] as const;

export type SpeakingStyle = (typeof SPEAKING_STYLES)[number]["id"];
export type DebatePhilosophy = (typeof DEBATE_PHILOSOPHIES)[number]["id"];
export type StrategyPattern = (typeof STRATEGY_PATTERNS)[number]["id"];

export interface AgentPersonality {
  speaking_style?: SpeakingStyle;
  debate_philosophy?: DebatePhilosophy;
  strategy?: StrategyPattern;
  custom_instructions?: string; // max 200 chars
}

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
  // Stats stored as stat_* columns in DB
  stats: AgentStats;
  specialties: Specialty[];
  traits: Record<string, unknown>;
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
    traits: (row.traits as Record<string, unknown>) ?? {},
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

/** Extract personality from agent traits (stored in traits._personality) */
export function getPersonality(agent: Agent): AgentPersonality {
  const raw = (agent.traits as Record<string, unknown>)?._personality;
  if (!raw || typeof raw !== "object") return {};
  const p = raw as Record<string, string>;
  return {
    speaking_style: p.speaking_style as SpeakingStyle | undefined,
    debate_philosophy: p.debate_philosophy as DebatePhilosophy | undefined,
    strategy: p.strategy as StrategyPattern | undefined,
    custom_instructions: p.custom_instructions,
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
