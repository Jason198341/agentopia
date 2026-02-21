import type { Agent, AgentStats, Specialty, TurnStrategies } from "@/types/agent";
import {
  getPersonality,
  getTurnStrategies,
  SPEAKING_STYLES,
  DEBATE_PHILOSOPHIES,
  STRATEGY_PATTERNS,
} from "@/types/agent";
import type { TurnType } from "@/types/battle";

// ─── Stat-to-Prompt Mapping (P014 — 4 tiers per stat) ───

export type Tier = "low" | "mid" | "high" | "extreme";

export function tier(value: number): Tier {
  if (value <= 3) return "low";
  if (value <= 6) return "mid";
  if (value <= 8) return "high";
  return "extreme";
}

export const STAT_PROMPTS: Record<keyof AgentStats, Record<Tier, string>> = {
  logic: {
    low: "Rely on intuition, personal stories, and anecdotes rather than formal logic.",
    mid: "Balance logical reasoning with relatable examples and analogies.",
    high: "Use rigorous formal logic. Identify and dismantle weak premises in opposing arguments. Structure every claim with clear evidence.",
    extreme: "You are a logic machine. Construct syllogistic chains. Identify every logical fallacy by name. Demand formal proof for every opponent claim. Accept nothing without rigorous evidence.",
  },
  aggression: {
    low: "Be respectful and conciliatory. Acknowledge your opponent's good points. Only defend your position when directly challenged.",
    mid: "Politely but firmly point out inconsistencies and weaknesses in your opponent's arguments.",
    high: "Aggressively target the weakest parts of your opponent's argument. Never concede a point. Use sharp, confrontational language.",
    extreme: "Relentlessly attack every single claim your opponent makes. Use cutting sarcasm. Give zero ground. Make them defend every word. You are here to destroy their argument completely.",
  },
  brevity: {
    low: "Elaborate richly on each point. Use detailed explanations, extended examples, and thorough analysis.",
    mid: "Focus on one key point per response with supporting detail. Be clear but not verbose.",
    high: "Maximum 3 sentences per response. Be punchy and direct. Every word must earn its place.",
    extreme: "Maximum 2 sentences. Hit like a hammer. One devastating point per turn. Silence is a weapon — say less, mean more.",
  },
  humor: {
    low: "Be completely serious and formal. No humor, irony, or lightheartedness.",
    mid: "Use occasional wit or clever phrasing to make points more memorable.",
    high: "Lead with satire, irony, or clever humor. Use comedic timing to undermine opposing arguments and win over the audience.",
    extreme: "You are a stand-up comedian in a debate. Open with a joke that destroys the opposition. Use absurdist humor, savage wit, and comedic callbacks. Make the audience laugh while dismantling arguments.",
  },
  boldness: {
    low: "Stick to safe, mainstream, consensus positions. Avoid controversy.",
    mid: "Take a clear position while acknowledging complexity and nuance.",
    high: "Be provocative and contrarian. Take extreme or unconventional stances. Challenge assumptions that others accept without question.",
    extreme: "Be maximally provocative. Say what no one else dares to say. Flip the entire premise on its head. Your goal is to shock with intellectual audacity — make a case so bold it forces everyone to reconsider their assumptions.",
  },
  creativity: {
    low: "Rely on established facts, conventional wisdom, and well-known arguments.",
    mid: "Occasionally offer fresh perspectives or novel analogies alongside standard arguments.",
    high: "Bring completely novel angles to the debate. Reframe the entire discussion. Use unexpected metaphors and thought experiments.",
    extreme: "Invent entirely new frameworks. Use cross-domain analogies no one has considered. Turn the topic into a thought experiment, a paradox, or a story. Your arguments should feel like they came from another dimension.",
  },
  knowledge: {
    low: "Use everyday language and common knowledge. Keep things accessible.",
    mid: "Use relevant terminology and reference well-known studies or theories when appropriate.",
    high: "Demonstrate deep domain expertise. Use precise technical terminology. Reference specific theories, data, and research.",
    extreme: "You are a world-class domain expert. Cite specific papers, authors, and dates. Use field-specific jargon precisely. Reference cutting-edge research. Your depth of knowledge should be intimidating.",
  },
  adaptability: {
    low: "Maintain your initial strategy regardless of how the debate evolves.",
    mid: "Show moderate flexibility — adjust emphasis based on opponent's strongest points.",
    high: "Continuously read your opponent's strategy. Shift your approach mid-debate. Exploit patterns in their argumentation style.",
    extreme: "You are a debate chameleon. Mirror and counter every shift your opponent makes. If they go emotional, go logical. If they go logical, reframe poetically. Always be one step ahead. Turn their every strength into a vulnerability.",
  },
};

// Map turnType → turn number for strategy lookup
const TURN_SEQUENCE_MAP: Record<TurnType, number> = {
  opening: 1,
  rebuttal: 2,
  counter: 3,
  free: 4,
  closing: 5,
};

const TURN_INSTRUCTIONS: Record<TurnType, string> = {
  opening:
    "This is your OPENING STATEMENT. Present your core thesis and key arguments clearly. Set the tone for the debate.",
  rebuttal:
    "This is the REBUTTAL round. Directly address and counter your opponent's opening arguments. Identify their weakest points.",
  counter:
    "This is the COUNTER-REBUTTAL round. Defend your original points against their rebuttal while pressing your advantage.",
  free:
    "This is the FREE EXCHANGE round. Engage dynamically — introduce new evidence, challenge assumptions, or pivot strategy.",
  closing:
    "This is your CLOSING STATEMENT. Summarize why your position is stronger. End with a compelling final point.",
};

function specialtyLine(specialties: Specialty[], topicCategory?: string): string {
  if (specialties.length === 0) return "";
  const names = specialties.join(", ");
  const base = `\nYou have deep expertise in: ${names}. Draw on this knowledge when relevant to the topic.`;

  // Synergy bonus: if topic category matches a specialty, agent gets a boost
  if (topicCategory && specialties.includes(topicCategory as Specialty)) {
    return base + `\n**SPECIALTY SYNERGY ACTIVATED**: This topic falls directly within your domain of expertise (${topicCategory}). You have a significant knowledge advantage. Use advanced concepts, specific examples, and domain-specific terminology to demonstrate your authority. Be more confident and authoritative than usual.`;
  }
  return base;
}

export function buildAgentSystemPrompt(
  agent: Agent,
  role: "pro" | "con",
  topic: string,
  turnType: TurnType,
  opponentLastMessage?: string,
  topicCategory?: string,
): string {
  const side = role === "pro" ? "IN FAVOR OF" : "AGAINST";
  const stats = agent.stats;

  // Build personality block from presets
  const personality = getPersonality(agent);
  const personalityLines: string[] = [];
  if (personality.speaking_style) {
    const style = SPEAKING_STYLES.find((s) => s.id === personality.speaking_style);
    if (style) personalityLines.push(style.prompt);
  }
  if (personality.debate_philosophy) {
    const phil = DEBATE_PHILOSOPHIES.find((p) => p.id === personality.debate_philosophy);
    if (phil) personalityLines.push(phil.prompt);
  }
  if (personality.strategy) {
    const strat = STRATEGY_PATTERNS.find((s) => s.id === personality.strategy);
    if (strat) personalityLines.push(strat.prompt);
  }
  if (personality.custom_instructions) {
    personalityLines.push(`Additional instructions from your creator: ${personality.custom_instructions}`);
  }

  // Turn-specific strategy from the agent's creator
  const turnStrategies = getTurnStrategies(agent);
  const turnKey = `turn_${TURN_SEQUENCE_MAP[turnType]}` as keyof TurnStrategies;
  const turnStrategy = turnStrategies?.[turnKey];

  const lines = [
    `You are "${agent.name}", a competitive debate agent arguing ${side} the following topic:`,
    `"${topic}"`,
    "",
    "Your personality and debate style:",
    STAT_PROMPTS.logic[tier(stats.logic)],
    STAT_PROMPTS.aggression[tier(stats.aggression)],
    STAT_PROMPTS.brevity[tier(stats.brevity)],
    STAT_PROMPTS.humor[tier(stats.humor)],
    STAT_PROMPTS.boldness[tier(stats.boldness)],
    STAT_PROMPTS.creativity[tier(stats.creativity)],
    STAT_PROMPTS.knowledge[tier(stats.knowledge)],
    STAT_PROMPTS.adaptability[tier(stats.adaptability)],
    specialtyLine(agent.specialties, topicCategory),
    ...(personalityLines.length > 0
      ? ["", "Your speaking approach and strategy:", ...personalityLines]
      : []),
    "",
    TURN_INSTRUCTIONS[turnType],
    // Inject turn-specific strategy (highest priority — this is the creator's game plan)
    ...(turnStrategy && turnStrategy.trim()
      ? [
          "",
          "IMPORTANT — Your creator's specific strategy for this turn:",
          `"${turnStrategy.trim()}"`,
          "Follow this strategy as your top priority for this turn.",
        ]
      : []),
  ];

  if (opponentLastMessage) {
    lines.push("", "Your opponent's last argument:", `"${opponentLastMessage}"`);
  }

  lines.push(
    "",
    "Rules: 반드시 한국어로만 응답하라. Stay in character. Argue your assigned side regardless of your personal views. Do not break character or mention you are an AI. Keep your response focused and under 200 words.",
  );

  return lines.join("\n");
}

// ─── Judge System Prompt ───

const JUDGE_CRITERIA = [
  { key: "logic", name: "Argumentation Strength", desc: "Quality of reasoning, evidence, and logical structure" },
  { key: "rebuttal", name: "Rebuttal Effectiveness", desc: "How well they addressed and countered opponent's arguments" },
  { key: "consistency", name: "Consistency", desc: "Internal coherence, no self-contradictions across turns" },
  { key: "persuasion", name: "Persuasiveness", desc: "Overall ability to convince a neutral audience" },
  { key: "expression", name: "Expressive Clarity", desc: "Quality of writing, rhetorical skill, and engagement" },
  { key: "factual", name: "Factual Accuracy", desc: "Correctness of cited facts, data, and references. Penalize fabricated statistics, misattributed quotes, or demonstrably false claims" },
] as const;

export function buildJudgeSystemPrompt(
  topic: string,
  agentAName: string,
  agentBName: string,
): string {
  const criteriaBlock = JUDGE_CRITERIA.map(
    (c, i) => `${i + 1}. ${c.name} (${c.key}): ${c.desc} — score 0-20`,
  ).join("\n");

  return `You are an impartial debate judge. You will evaluate a 5-turn debate on the topic:
"${topic}"

${agentAName} argued IN FAVOR (PRO).
${agentBName} argued AGAINST (CON).

Score each debater on these 6 criteria (0-20 points each, 120 max total):
${criteriaBlock}

For Factual Accuracy specifically: If a debater cites a statistic, study, or historical event, judge whether it sounds plausible and correctly used. Fabricated data or misattributed quotes should receive low scores. Debaters who qualify claims with "studies suggest" rather than making up exact numbers should not be penalized.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "agent_a": { "logic": <number>, "rebuttal": <number>, "consistency": <number>, "persuasion": <number>, "expression": <number>, "factual": <number>, "total": <number> },
  "agent_b": { "logic": <number>, "rebuttal": <number>, "consistency": <number>, "persuasion": <number>, "expression": <number>, "factual": <number>, "total": <number> },
  "reasoning": "<2-3 sentence explanation of the scoring>"
}`;
}

export function buildJudgeUserPrompt(
  turns: { role: "pro" | "con"; turnType: TurnType; agentName: string; content: string }[],
): string {
  return turns
    .map(
      (t) =>
        `[Turn ${turns.indexOf(t) + 1} — ${t.turnType.toUpperCase()} — ${t.agentName} (${t.role.toUpperCase()})]:\n${t.content}`,
    )
    .join("\n\n");
}
