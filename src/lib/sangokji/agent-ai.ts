import { fireworksCompletion } from '@/lib/ai';
import { toASCII } from './map';
import type { SGGameState, SGAgent, AgentDecision, AgentAction, ActionType } from '@/types/sangokji';

// Default fallback when AI call fails
const DEFAULT_ACTION: AgentAction = { type: 'DEFEND', params: {} };

/**
 * Build system + user prompts for a single agent.
 * Kept under ~800 tokens to minimize cost.
 */
export function buildPrompt(
  state: SGGameState,
  agent: SGAgent
): { system: string; user: string } {
  const asciiMap = toASCII(state.tiles, agent.id);

  const enemyStatus = state.agents
    .filter((a) => a.id !== agent.id && a.alive)
    .map((a) => `- ${a.name}(${a.id}): 영토 ${a.territory.length}칸, 병력 ${a.troops}`)
    .join('\n');

  const system = `당신은 전략 시뮬레이션 게임의 AI 군주입니다.
성격: ${agent.personality}
전략: ${agent.strategy}

반드시 JSON 형식으로만 응답하세요:
{
  "reasoning": "한 문장 판단 이유",
  "actions": [
    { "type": "EXPAND|RECRUIT|ATTACK|DEFEND", "params": { "target": "x,y" 또는 {} } }
  ]
}

규칙:
- EXPAND: 인접한 빈 타일 점령 (params.target: "x,y")
- RECRUIT: 수도에서 병력 모집 (gold 5 소모, 병력 +3)
- ATTACK: 인접한 적 타일 공격 (params.target: "x,y")
- DEFEND: 이번 턴 방어 태세
- actions 배열에 1~2개 행동만 포함`;

  const user = `현재 턴: ${state.turn}/${state.max_turns}
나(${agent.name}): 영토 ${agent.territory.length}칸, 병력 ${agent.troops}, food ${agent.resources.food}, gold ${agent.resources.gold}
수도: ${agent.capital}

맵 (${agent.id[agent.id.length-1] === '0' ? 'A' : agent.id[agent.id.length-1] === '1' ? 'B' : agent.id[agent.id.length-1] === '2' ? 'C' : 'D'}=내 영토, 소문자=적, .=평원, F=숲, #=산):
${asciiMap}

적 세력:
${enemyStatus || '없음'}

행동을 결정하세요.`;

  return { system, user };
}

/**
 * Parse AI response JSON into AgentDecision.
 * Falls back to DEFEND on any parse error.
 */
function parseDecision(agentId: string, raw: string): AgentDecision {
  try {
    // Try to extract JSON even if wrapped in markdown code blocks
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');

    const parsed = JSON.parse(match[0]);
    const actions: AgentAction[] = [];

    if (Array.isArray(parsed.actions)) {
      for (const act of parsed.actions.slice(0, 2)) {
        const type = String(act.type ?? '').toUpperCase() as ActionType;
        if (['EXPAND', 'RECRUIT', 'ATTACK', 'DEFEND'].includes(type)) {
          actions.push({ type, params: act.params ?? {} });
        }
      }
    }

    return {
      agent_id: agentId,
      reasoning: String(parsed.reasoning ?? ''),
      actions: actions.length > 0 ? actions : [DEFAULT_ACTION],
    };
  } catch {
    return {
      agent_id: agentId,
      reasoning: '(파싱 실패 — 방어 태세)',
      actions: [DEFAULT_ACTION],
    };
  }
}

/**
 * Get decisions for ALL alive agents in parallel using Fireworks AI.
 * Uses Promise.allSettled so one failure doesn't block others.
 */
export async function getAgentDecisions(state: SGGameState): Promise<AgentDecision[]> {
  const aliveAgents = state.agents.filter((a) => a.alive);

  const results = await Promise.allSettled(
    aliveAgents.map(async (agent) => {
      const { system, user } = buildPrompt(state, agent);

      const result = await fireworksCompletion({
        systemPrompt: system,
        userPrompt: user,
        maxTokens: 300,
        temperature: 0.8,
      });

      return parseDecision(agent.id, result.content);
    })
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    // Fallback for failed calls
    return {
      agent_id: aliveAgents[i].id,
      reasoning: `(AI 호출 실패: ${result.reason?.message ?? 'unknown'})`,
      actions: [DEFAULT_ACTION],
    };
  });
}
