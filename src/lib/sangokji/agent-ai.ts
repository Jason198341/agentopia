import { fireworksCompletion } from '@/lib/ai';
import { toASCII, getAttackableTargets, getExpandableTargets } from './map';
import type { SGGameState, SGAgent, AgentDecision, AgentAction, ActionType } from '@/types/sangokji';

// Default fallback when AI call fails
const DEFAULT_ACTION: AgentAction = { type: 'DEFEND', params: {} };

/**
 * Build system + user prompts for a single agent.
 * Explicitly lists attackable/expandable targets so the LLM doesn't need
 * to do spatial reasoning from ASCII art.
 */
export function buildPrompt(
  state: SGGameState,
  agent: SGAgent
): { system: string; user: string } {
  const agentNames = Object.fromEntries(state.agents.map((a) => [a.id, a.name]));

  // Pre-compute valid targets — removes spatial reasoning burden from LLM
  const attackTargets = getAttackableTargets(state.tiles, agent, agentNames);
  const expandTargets = getExpandableTargets(state.tiles, agent);

  const attackLines = attackTargets.length > 0
    ? attackTargets.map((t) => {
        const ratio = agent.troops > 0 && t.garrison > 0
          ? (agent.troops / t.garrison).toFixed(1)
          : agent.troops > 0 ? '∞' : '0';
        const advice = agent.troops >= t.garrison * 1.5 ? ' ← 유리' : t.garrison > agent.troops ? ' ← 불리' : '';
        return `  - [${t.key}] ${t.terrain}(${t.ownerName} 방어 ${t.garrison}명, 내 병력 ${agent.troops}명, 비율 ${ratio}배)${advice}`;
      }).join('\n')
    : '  없음 (현재 인접한 적 타일 없음)';

  const expandLines = expandTargets.length > 0
    ? expandTargets.map((t) => `  - [${t.key}] ${t.terrain}`).join('\n')
    : '  없음';

  const turnsLeft = state.max_turns - state.turn;
  const urgency = turnsLeft <= 10
    ? `\n⚠️ 잔여 턴 ${turnsLeft}턴! 최다 영토 보유자가 승리합니다. 지금 즉시 공격/점령하세요!`
    : turnsLeft <= 20
    ? `\n📌 후반전(잔여 ${turnsLeft}턴). 영토 확장이 중요합니다.`
    : '';

  const system = `당신은 전략 시뮬레이션 게임의 AI 군주입니다.
성격: ${agent.personality}
전략: ${agent.strategy}

반드시 JSON만 응답하세요:
{"reasoning":"이유","actions":[{"type":"EXPAND|RECRUIT|ATTACK|DEFEND","params":{"target":"x,y"}}]}

행동 규칙:
- EXPAND: 빈 타일 점령. params.target = "x,y" (점령 가능 목록에서 선택)
- RECRUIT: 수도에서 병력+3. gold -5 필요. params = {}
- ATTACK: 적 타일 공격. params.target = "x,y" (공격 가능 목록에서 선택)
- DEFEND: 방어. params = {}
공격 판단: 내 병력 ≥ 적 수비대 × 1.3이면 공격 유리. 잔여 턴이 적을수록 공격 우선.`;

  const user = `턴 ${state.turn}/${state.max_turns}${urgency}

나(${agent.name}): 영토 ${agent.territory.length}칸 | 병력 ${agent.troops} | 식량 ${agent.resources.food} | 금 ${agent.resources.gold}

공격 가능 타일 (즉시 공격 가능한 인접 적 타일):
${attackLines}

점령 가능 타일 (인접한 빈 타일):
${expandLines}

적 세력 요약:
${state.agents.filter((a) => a.id !== agent.id && a.alive)
  .map((a) => `  - ${a.name}: 영토 ${a.territory.length}칸 병력 ${a.troops}`).join('\n') || '  없음'}

행동 1~2개를 위 목록에서 골라 결정하세요.`;

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
