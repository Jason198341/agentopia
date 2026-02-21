import type { Agent, AgentStats, Specialty } from "@/types/agent";
import type { TurnType } from "@/types/battle";

// ─── Stat-to-Prompt Mapping (P014 — 3 tiers per stat) ───

type Tier = "low" | "mid" | "high";

function tier(value: number): Tier {
  if (value <= 3) return "low";
  if (value <= 6) return "mid";
  return "high";
}

const STAT_PROMPTS: Record<keyof AgentStats, Record<Tier, string>> = {
  logic: {
    low: "Rely on intuition, personal stories, and anecdotes rather than formal logic.",
    mid: "Balance logical reasoning with relatable examples and analogies.",
    high: "Use rigorous formal logic. Identify and dismantle weak premises in opposing arguments. Structure every claim with clear evidence.",
  },
  aggression: {
    low: "Be respectful and conciliatory. Acknowledge your opponent's good points. Only defend your position when directly challenged.",
    mid: "Politely but firmly point out inconsistencies and weaknesses in your opponent's arguments.",
    high: "Aggressively target the weakest parts of your opponent's argument. Never concede a point. Use sharp, confrontational language.",
  },
  brevity: {
    low: "Elaborate richly on each point. Use detailed explanations, extended examples, and thorough analysis.",
    mid: "Focus on one key point per response with supporting detail. Be clear but not verbose.",
    high: "Maximum 3 sentences per response. Be punchy and direct. Every word must earn its place.",
  },
  humor: {
    low: "Be completely serious and formal. No humor, irony, or lightheartedness.",
    mid: "Use occasional wit or clever phrasing to make points more memorable.",
    high: "Lead with satire, irony, or clever humor. Use comedic timing to undermine opposing arguments and win over the audience.",
  },
  boldness: {
    low: "Stick to safe, mainstream, consensus positions. Avoid controversy.",
    mid: "Take a clear position while acknowledging complexity and nuance.",
    high: "Be provocative and contrarian. Take extreme or unconventional stances. Challenge assumptions that others accept without question.",
  },
  creativity: {
    low: "Rely on established facts, conventional wisdom, and well-known arguments.",
    mid: "Occasionally offer fresh perspectives or novel analogies alongside standard arguments.",
    high: "Bring completely novel angles to the debate. Reframe the entire discussion. Use unexpected metaphors and thought experiments.",
  },
  knowledge: {
    low: "Use everyday language and common knowledge. Keep things accessible.",
    mid: "Use relevant terminology and reference well-known studies or theories when appropriate.",
    high: "Demonstrate deep domain expertise. Use precise technical terminology. Reference specific theories, data, and research.",
  },
  adaptability: {
    low: "Maintain your initial strategy regardless of how the debate evolves.",
    mid: "Show moderate flexibility — adjust emphasis based on opponent's strongest points.",
    high: "Continuously read your opponent's strategy. Shift your approach mid-debate. Exploit patterns in their argumentation style.",
  },
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

function specialtyLine(specialties: Specialty[]): string {
  if (specialties.length === 0) return "";
  const names = specialties.join(", ");
  return `\nYou have deep expertise in: ${names}. Draw on this knowledge when relevant to the topic.`;
}

export function buildAgentSystemPrompt(
  agent: Agent,
  role: "pro" | "con",
  topic: string,
  turnType: TurnType,
  opponentLastMessage?: string,
): string {
  const side = role === "pro" ? "IN FAVOR OF" : "AGAINST";
  const stats = agent.stats;

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
    specialtyLine(agent.specialties),
    "",
    TURN_INSTRUCTIONS[turnType],
  ];

  if (opponentLastMessage) {
    lines.push("", "Your opponent's last argument:", `"${opponentLastMessage}"`);
  }

  lines.push(
    "",
    "Rules: Stay in character. Argue your assigned side regardless of your personal views. Do not break character or mention you are an AI. Keep your response focused and under 200 words.",
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

Score each debater on these 5 criteria (0-20 points each, 100 max total):
${criteriaBlock}

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "agent_a": { "logic": <number>, "rebuttal": <number>, "consistency": <number>, "persuasion": <number>, "expression": <number>, "total": <number> },
  "agent_b": { "logic": <number>, "rebuttal": <number>, "consistency": <number>, "persuasion": <number>, "expression": <number>, "total": <number> },
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
