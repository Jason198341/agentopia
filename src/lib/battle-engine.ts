import type { Agent } from "@/types/agent";
import type { BattleScore, BattleTurn, TurnType } from "@/types/battle";
import { TURN_SEQUENCE } from "@/types/battle";
import {
  buildAgentSystemPrompt,
  buildJudgeSystemPrompt,
  buildJudgeUserPrompt,
} from "@/data/prompts/battle";
import { fireworksCompletion } from "./ai";

// ─── Types ───

interface TurnResult {
  pro: { content: string; tokens: number };
  con: { content: string; tokens: number };
}

interface JudgeResult {
  score_a: BattleScore;
  score_b: BattleScore;
  reasoning: string;
}

interface FullBattleResult {
  turns: TurnResult[];
  judgeResult: JudgeResult;
  winner_id: string | null;
  elo_change_a: number;
  elo_change_b: number;
}

// ─── Execute a Single Turn ───

async function executeTurn(
  agentPro: Agent,
  agentCon: Agent,
  topic: string,
  turnType: TurnType,
  previousProMessage?: string,
  previousConMessage?: string,
): Promise<TurnResult> {
  // PRO goes first
  const proResult = await fireworksCompletion({
    systemPrompt: buildAgentSystemPrompt(
      agentPro,
      "pro",
      topic,
      turnType,
      previousConMessage,
    ),
    userPrompt: "Present your argument now.",
    maxTokens: 500,
    temperature: 0.7,
  });

  // CON responds after seeing PRO's message (except turn 1 where they go parallel)
  const conResult = await fireworksCompletion({
    systemPrompt: buildAgentSystemPrompt(
      agentCon,
      "con",
      topic,
      turnType,
      turnType === "opening" ? previousProMessage : proResult.content,
    ),
    userPrompt: "Present your argument now.",
    maxTokens: 500,
    temperature: 0.7,
  });

  return {
    pro: { content: proResult.content, tokens: proResult.tokens_used },
    con: { content: conResult.content, tokens: conResult.tokens_used },
  };
}

// ─── Judge the Battle ───

async function judgeBattle(
  topic: string,
  agentA: Agent,
  agentB: Agent,
  turns: TurnResult[],
): Promise<JudgeResult> {
  const turnData = turns.flatMap((t, i) => {
    const turnType = TURN_SEQUENCE[i].type;
    return [
      { role: "pro" as const, turnType, agentName: agentA.name, content: t.pro.content },
      { role: "con" as const, turnType, agentName: agentB.name, content: t.con.content },
    ];
  });

  const result = await fireworksCompletion({
    systemPrompt: buildJudgeSystemPrompt(topic, agentA.name, agentB.name),
    userPrompt: buildJudgeUserPrompt(turnData),
    maxTokens: 500,
    temperature: 0.3, // Low temp for consistent judging
  });

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = result.content;
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1];

  const parsed = JSON.parse(jsonStr.trim());

  const toScore = (s: Record<string, number>): BattleScore => ({
    logic: clamp(s.logic ?? 0, 0, 20),
    rebuttal: clamp(s.rebuttal ?? 0, 0, 20),
    consistency: clamp(s.consistency ?? 0, 0, 20),
    persuasion: clamp(s.persuasion ?? 0, 0, 20),
    expression: clamp(s.expression ?? 0, 0, 20),
    total:
      clamp(s.logic ?? 0, 0, 20) +
      clamp(s.rebuttal ?? 0, 0, 20) +
      clamp(s.consistency ?? 0, 0, 20) +
      clamp(s.persuasion ?? 0, 0, 20) +
      clamp(s.expression ?? 0, 0, 20),
  });

  return {
    score_a: toScore(parsed.agent_a),
    score_b: toScore(parsed.agent_b),
    reasoning: parsed.reasoning ?? "",
  };
}

// ─── ELO Calculation (K=32) ───

export function calculateElo(
  eloA: number,
  eloB: number,
  scoreA: number,
  scoreB: number,
): { changeA: number; changeB: number } {
  const K = 32;

  // Expected scores
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  const expectedB = 1 - expectedA;

  // Actual outcome: 1 = win, 0.5 = draw, 0 = loss
  let actualA: number;
  let actualB: number;
  if (scoreA > scoreB) {
    actualA = 1;
    actualB = 0;
  } else if (scoreB > scoreA) {
    actualA = 0;
    actualB = 1;
  } else {
    actualA = 0.5;
    actualB = 0.5;
  }

  const changeA = Math.round(K * (actualA - expectedA));
  const changeB = Math.round(K * (actualB - expectedB));

  return { changeA, changeB };
}

// ─── Full Battle Orchestration ───

export async function runFullBattle(
  agentA: Agent, // PRO
  agentB: Agent, // CON
  topic: string,
): Promise<FullBattleResult> {
  const turns: TurnResult[] = [];

  for (let i = 0; i < TURN_SEQUENCE.length; i++) {
    const { type: turnType } = TURN_SEQUENCE[i];
    const prevTurn = i > 0 ? turns[i - 1] : undefined;

    const result = await executeTurn(
      agentA,
      agentB,
      topic,
      turnType,
      prevTurn?.pro.content,
      prevTurn?.con.content,
    );
    turns.push(result);
  }

  // Judge
  const judgeResult = await judgeBattle(topic, agentA, agentB, turns);

  // ELO
  const { changeA, changeB } = calculateElo(
    agentA.elo,
    agentB.elo,
    judgeResult.score_a.total,
    judgeResult.score_b.total,
  );

  // Determine winner
  let winner_id: string | null = null;
  if (judgeResult.score_a.total > judgeResult.score_b.total) {
    winner_id = agentA.id;
  } else if (judgeResult.score_b.total > judgeResult.score_a.total) {
    winner_id = agentB.id;
  }

  return {
    turns,
    judgeResult,
    winner_id,
    elo_change_a: changeA,
    elo_change_b: changeB,
  };
}

// ─── Helpers ───

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
