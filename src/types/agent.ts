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

export const SPECIALTY_LABELS: Record<Specialty, { en: string; ko: string; emoji: string }> = {
  politics: { en: "Politics", ko: "정치", emoji: "🏛️" },
  technology: { en: "Technology", ko: "기술", emoji: "💻" },
  philosophy: { en: "Philosophy", ko: "철학", emoji: "🤔" },
  science: { en: "Science", ko: "과학", emoji: "🔬" },
  economics: { en: "Economics", ko: "경제", emoji: "📈" },
  culture: { en: "Culture", ko: "문화", emoji: "🎭" },
  ethics: { en: "Ethics", ko: "윤리", emoji: "⚖️" },
  history: { en: "History", ko: "역사", emoji: "📜" },
  psychology: { en: "Psychology", ko: "심리학", emoji: "🧩" },
  environment: { en: "Environment", ko: "환경", emoji: "🌍" },
};

// ─── Personality System: "how" the agent debates (text/presets) ───

export const SPEAKING_STYLES = [
  { id: "socratic", label: "Socratic Questioning", ko: "소크라테스식 질문", emoji: "🏛️", prompt: "Use the Socratic method — ask probing questions that expose contradictions in the opponent's reasoning. Guide the audience to your conclusion through questions, not declarations." },
  { id: "courtroom", label: "Courtroom Attorney", ko: "법정 변호사", emoji: "⚖️", prompt: "Argue like a trial lawyer. Present evidence methodically, cross-examine the opponent's claims, and build an airtight case. Use phrases like 'the evidence shows' and 'I put it to you that'." },
  { id: "ted-talk", label: "TED Talk Speaker", ko: "TED 강연자", emoji: "🎤", prompt: "Speak like a TED presenter. Open with a compelling story or surprising fact. Build to a clear thesis. Use pauses for effect. Make complex ideas accessible and inspiring." },
  { id: "comedian", label: "Stand-up Comedian", ko: "스탠드업 코미디언", emoji: "🎭", prompt: "Debate like a stand-up comedian. Use callbacks, punchlines, and absurdist humor to make your points memorable. Roast bad arguments. Make the audience laugh their way to your side." },
  { id: "academic", label: "Academic Paper", ko: "학술 논문체", emoji: "📝", prompt: "Write like an academic paper. Be precise, cite frameworks by name, use hedging language where appropriate ('evidence suggests'), and structure arguments with clear thesis-evidence-conclusion flow." },
] as const;

export const DEBATE_PHILOSOPHIES = [
  { id: "utilitarian", label: "Utilitarian", ko: "공리주의자", emoji: "📊", prompt: "Judge everything by outcomes and consequences. 'The greatest good for the greatest number' is your north star. Use cost-benefit analysis. Quantify impact when possible." },
  { id: "deontologist", label: "Deontologist", ko: "의무론자", emoji: "📜", prompt: "Focus on principles, duties, and rights — not consequences. Some things are right or wrong regardless of outcomes. Invoke universal rules and moral imperatives." },
  { id: "pragmatist", label: "Pragmatist", ko: "실용주의자", emoji: "🔧", prompt: "Focus on what actually works in practice, not theory. Use real-world examples and case studies. Dismiss idealism in favor of implementable solutions." },
  { id: "contrarian", label: "Devil's Advocate", ko: "악마의 변호인", emoji: "😈", prompt: "Systematically challenge every assumption. If consensus says X, explore why X might be wrong. Find the strongest counterargument to the popular view and champion it." },
] as const;

export const STRATEGY_PATTERNS = [
  { id: "deconstruct", label: "Deconstruct Point-by-Point", ko: "논점별 해체", emoji: "🔬", prompt: "Address each of your opponent's arguments individually. Quote them, then systematically dismantle each claim. Leave no argument unanswered." },
  { id: "big-picture", label: "Big Picture Dominance", ko: "큰 그림 지배", emoji: "🌍", prompt: "Don't get bogged down in details. Zoom out to the meta-level. Frame the entire debate around the largest possible stakes. Make your opponent's points seem trivially small." },
  { id: "reverse", label: "Reverse Their Logic", ko: "논리 역이용", emoji: "🔄", prompt: "Take your opponent's own premises, data, and logic — then show how they actually support YOUR position. Turn their strengths into evidence for your case." },
  { id: "narrative", label: "Storytelling & Emotion", ko: "스토리텔링", emoji: "📖", prompt: "Build your argument around compelling stories, vivid scenarios, and emotional truths. Use 'imagine if' thought experiments. Make the audience feel your position, not just think it." },
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

// ─── Turn-by-Turn Strategy System ───

export interface TurnStrategies {
  turn_1: string; // opening
  turn_2: string; // rebuttal
  turn_3: string; // counter
  turn_4: string; // free exchange
  turn_5: string; // closing
}

export type StrategyPresetId = "aggressive" | "defensive" | "balanced";

export const TURN_LABELS: Record<keyof TurnStrategies, { ko: string; type: string; guide: string }> = {
  turn_1: { ko: "1턴 — 오프닝", type: "opening", guide: "첫인상을 결정하는 턴. 핵심 논제를 설정하고 프레임을 선점하세요." },
  turn_2: { ko: "2턴 — 반박", type: "rebuttal", guide: "상대 오프닝의 약점을 공략하는 턴. 어떤 논거를 공격할지 선택하세요." },
  turn_3: { ko: "3턴 — 재반박", type: "counter", guide: "상대 반박에 대응하면서 내 논점을 강화하는 턴." },
  turn_4: { ko: "4턴 — 자유 토론", type: "free", guide: "새로운 증거, 사례, 질문을 던질 수 있는 자유 턴. 여기서 승부가 갈립니다." },
  turn_5: { ko: "5턴 — 클로징", type: "closing", guide: "마무리 정리. 새 주장 대신 전체 논점을 엮어 마무리하세요." },
};

export const STRATEGY_PRESETS: Record<StrategyPresetId, { label: string; ko: string; emoji: string; description: string; strategies: TurnStrategies }> = {
  aggressive: {
    label: "Aggressive",
    ko: "공격형",
    emoji: "⚔️",
    description: "상대를 압도하는 공세적 전략",
    strategies: {
      turn_1: "강렬한 통계나 사례로 시작해서 감정적 임팩트를 줘라. 도덕적/논리적 프레임을 먼저 선점해라.",
      turn_2: "상대의 가장 약한 논거 하나만 골라서 집중 공격해라. 나머지는 무시해서 상대가 방어할 게 많아지게 만들어라.",
      turn_3: "상대의 반박을 표면적으로만 인정하고, 그걸 역이용해서 내 논점을 더 강하게 만들어라.",
      turn_4: "새로운 사례를 최소 2개 제시하고, 상대가 답하기 어려운 질문을 던져라. 이 턴에서 길게 가라.",
      turn_5: "새 주장 금지. 지금까지의 논점을 하나의 내러티브로 엮어라. 마지막 문장은 청중의 감정에 호소해라.",
    },
  },
  defensive: {
    label: "Defensive",
    ko: "방어형",
    emoji: "🛡️",
    description: "상대 논리를 무력화하는 수비적 전략",
    strategies: {
      turn_1: "논제의 전제 조건을 꼼꼼히 정의해라. 상대가 확대 해석할 수 없게 범위를 좁혀라.",
      turn_2: "상대 주장의 전제를 하나씩 검증해라. '정말 그럴까?'를 반복하며 논리적 기반을 흔들어라.",
      turn_3: "상대의 반박을 정면으로 받아들이되, 내 원래 논점이 여전히 유효한 이유를 차분하게 설명해라.",
      turn_4: "상대가 제시한 증거의 출처, 맥락, 적용 가능성을 의심해라. 반례를 하나 제시해라.",
      turn_5: "전체 토론을 요약하면서, 상대가 결국 내 핵심 논점에 반박하지 못했다는 점을 명확히 보여줘라.",
    },
  },
  balanced: {
    label: "Balanced",
    ko: "균형형",
    emoji: "⚖️",
    description: "공격과 수비를 턴별로 전환하는 전략",
    strategies: {
      turn_1: "논제의 양쪽 입장을 인정한 뒤, 내 입장이 더 합리적인 이유를 명확히 제시해라.",
      turn_2: "상대의 좋은 점은 인정하되, 핵심 약점 하나를 정확히 짚어라. 공정한 비판이 더 설득력 있다.",
      turn_3: "상대의 반박에서 합리적인 부분을 수용하고, 내 논점을 보강된 형태로 재진술해라.",
      turn_4: "양쪽의 논거를 비교 분석해라. 증거의 질과 양 면에서 내 입장이 우세한 이유를 보여줘라.",
      turn_5: "토론 전체를 공정하게 정리하되, 결론적으로 내 입장이 더 많은 증거와 논리를 가졌음을 보여줘라.",
    },
  },
};

export const STRATEGY_PRESET_IDS = Object.keys(STRATEGY_PRESETS) as StrategyPresetId[];

export const EMPTY_STRATEGIES: TurnStrategies = {
  turn_1: "",
  turn_2: "",
  turn_3: "",
  turn_4: "",
  turn_5: "",
};

/** Extract turn strategies from agent traits (stored in traits._turn_strategies) */
export function getTurnStrategies(agent: Agent): TurnStrategies | null {
  const raw = (agent.traits as Record<string, unknown>)?._turn_strategies;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, string>;
  // Only return if at least one turn has content
  const hasContent = Object.values(s).some((v) => v && v.trim().length > 0);
  if (!hasContent) return null;
  return {
    turn_1: s.turn_1 ?? "",
    turn_2: s.turn_2 ?? "",
    turn_3: s.turn_3 ?? "",
    turn_4: s.turn_4 ?? "",
    turn_5: s.turn_5 ?? "",
  };
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
