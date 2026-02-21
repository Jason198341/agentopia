import { generateMap, getTile, getAdjacentTiles } from './map';
import { resolveBattle } from './combat';
import { getAgentDecisions } from './agent-ai';
import type {
  SGGameState,
  SGAgent,
  GameConfig,
  TurnEvent,
  AgentDecision,
  AgentAction,
} from '@/types/sangokji';

// ─── Preset Agents ────────────────────────────────────────────────────────────

const PRESET_AGENTS: Omit<SGAgent, 'resources' | 'troops' | 'territory' | 'capital' | 'alive' | 'stats'>[] = [
  {
    id: 'agent_0',
    name: '화영국',
    color: '#ef4444',
    strategy: '공격이 최선의 방어다. 내 병력이 적 수비대보다 많으면 무조건 공격해라. 빈 타일은 즉시 점령해라. 병력이 부족하면 RECRUIT해라.',
    personality: '호전적 군주',
  },
  {
    id: 'agent_1',
    name: '청풍국',
    color: '#06b6d4',
    strategy: '초반 10턴은 빈 타일 점령에 집중해라. 11턴 이후 내 병력이 적 수비대의 1.3배 이상이면 반드시 공격해라. 병력이 적으면 RECRUIT 우선.',
    personality: '신중한 재상',
  },
  {
    id: 'agent_2',
    name: '황금국',
    color: '#fbbf24',
    strategy: '빈 타일을 먼저 점령하고, 내 병력이 적 수비대의 1.5배 이상이면 공격해라. 가장 병력이 적은 적을 우선 공격 대상으로 삼아라.',
    personality: '균형잡힌 군주',
  },
  {
    id: 'agent_3',
    name: '흑산국',
    color: '#8b5cf6',
    strategy: '빈 타일 점령을 최우선으로 해라. 내 병력이 적 수비대의 2배 이상일 때만 공격해라. 다른 세력이 약해지면 바로 공격 기회를 노려라.',
    personality: '교활한 책사',
  },
];

// Starting corners: [x, y] for agent_0..3
const START_CORNERS: [number, number][] = [
  [0, 0], [4, 0], [0, 4], [4, 4],
];

const DEFAULT_CONFIG: GameConfig = {
  mapSize: 5,
  maxTurns: 30,
  initialFood: 30,
  initialGold: 15,
  initialTroops: 5,
};

// ─── Game Initialization ──────────────────────────────────────────────────────

export function initGame(config: Partial<GameConfig> = {}): SGGameState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tiles = generateMap(cfg.mapSize);

  const agents: SGAgent[] = PRESET_AGENTS.map((preset, i) => {
    const [cx, cy] = START_CORNERS[i];
    const capitalKey = `${cx},${cy}`;

    // Claim starting tile
    tiles[cy][cx].owner = preset.id;
    tiles[cy][cx].garrison = cfg.initialTroops;

    return {
      ...preset,
      resources: { food: cfg.initialFood, gold: cfg.initialGold },
      troops: cfg.initialTroops,
      territory: [capitalKey],
      capital: capitalKey,
      alive: true,
      stats: { battles_won: 0, turns_survived: 0 },
    };
  });

  return {
    game_id: '',      // set by caller after DB insert
    turn: 0,
    max_turns: cfg.maxTurns,
    tiles,
    agents,
    status: 'running',
    winner_id: null,
  };
}

// ─── Resource Phase ───────────────────────────────────────────────────────────

function produceResources(state: SGGameState): TurnEvent[] {
  const events: TurnEvent[] = [];

  for (const agent of state.agents) {
    if (!agent.alive) continue;

    let foodGained = 0;
    for (const key of agent.territory) {
      const tile = getTile(state.tiles, key);
      if (!tile) continue;
      if (tile.terrain === 'plain') foodGained += 2;
      if (tile.terrain === 'forest') foodGained += 3;
    }

    // Upkeep: 1 food per troop
    const upkeep = agent.troops;
    const net = foodGained - upkeep;
    agent.resources.food = Math.max(0, agent.resources.food + net);

    // Gold: +1 per owned tile
    agent.resources.gold += agent.territory.length;

    events.push({
      type: 'resource',
      agent_id: agent.id,
      description: `${agent.name}: food +${foodGained} -${upkeep}(유지비) = ${net >= 0 ? '+' : ''}${net}, gold +${agent.territory.length}`,
    });
  }

  return events;
}

// ─── Action Execution ─────────────────────────────────────────────────────────

function executeAction(
  state: SGGameState,
  agent: SGAgent,
  action: AgentAction,
  events: TurnEvent[]
): void {
  switch (action.type) {
    case 'EXPAND': {
      const target = String(action.params.target ?? '');
      const tile = getTile(state.tiles, target);
      if (!tile || tile.terrain === 'mountain' || tile.owner !== null) return;

      // Must be adjacent to agent's territory
      const adj = getAdjacentTiles(state.tiles, target);
      const isAdjacent = adj.some((t) => t.owner === agent.id);
      if (!isAdjacent) return;

      tile.owner = agent.id;
      tile.garrison = 1;
      agent.territory.push(target);
      agent.troops += 0; // garrison comes from existing troops
      if (agent.troops > 0) {
        tile.garrison = 1;
      }

      events.push({
        type: 'expand',
        agent_id: agent.id,
        description: `${agent.name}이(가) [${target}] ${tile.terrain} 타일을 점령했습니다.`,
        details: { target },
      });
      break;
    }

    case 'RECRUIT': {
      const cost = 5;
      if (agent.resources.gold < cost) return;

      agent.resources.gold -= cost;
      agent.troops += 3;

      const capitalTile = getTile(state.tiles, agent.capital);
      if (capitalTile) capitalTile.garrison += 3;

      events.push({
        type: 'recruit',
        agent_id: agent.id,
        description: `${agent.name}이(가) 병력 3명을 모집했습니다. (gold -${cost})`,
      });
      break;
    }

    case 'ATTACK': {
      const target = String(action.params.target ?? '');
      const tile = getTile(state.tiles, target);
      if (!tile || tile.terrain === 'mountain' || !tile.owner || tile.owner === agent.id) return;

      // Must be adjacent to agent's territory
      const adj = getAdjacentTiles(state.tiles, target);
      const isAdjacent = adj.some((t) => t.owner === agent.id);
      if (!isAdjacent) return;

      const defender = state.agents.find((a) => a.id === tile.owner);
      if (!defender || !defender.alive) return;

      const attackerTroops = Math.min(agent.troops, Math.ceil(agent.troops * 0.7));
      const result = resolveBattle(attackerTroops, tile.garrison, tile.terrain);

      if (result.winner === 'attacker') {
        agent.troops -= result.attackerLoss;
        defender.troops -= result.defenderLoss;
        tile.owner = agent.id;
        tile.garrison = attackerTroops - result.attackerLoss;
        agent.territory.push(target);
        defender.territory = defender.territory.filter((k) => k !== target);
        agent.stats.battles_won++;

        events.push({
          type: 'battle',
          agent_id: agent.id,
          description: `${agent.name}이(가) [${target}]에서 ${defender.name}을 격파! (공격손실 ${result.attackerLoss}, 방어손실 ${result.defenderLoss})`,
          details: { target, winner: agent.id, loser: defender.id, result },
        });
      } else {
        agent.troops -= result.attackerLoss;
        defender.troops -= result.defenderLoss;

        events.push({
          type: 'battle',
          agent_id: agent.id,
          description: `${agent.name}의 [${target}] 공격 실패. ${defender.name} 방어 성공 (공격손실 ${result.attackerLoss})`,
          details: { target, winner: defender.id, loser: agent.id, result },
        });
      }
      break;
    }

    case 'DEFEND':
    default:
      // No action
      break;
  }
}

// ─── Death & Victory Check ────────────────────────────────────────────────────

function checkDeathAndVictory(state: SGGameState, events: TurnEvent[]): void {
  for (const agent of state.agents) {
    if (!agent.alive) continue;

    const isEliminated = agent.troops <= 0 || agent.territory.length === 0;
    if (isEliminated) {
      agent.alive = false;

      // Release territory
      for (const key of agent.territory) {
        const tile = getTile(state.tiles, key);
        if (tile) { tile.owner = null; tile.garrison = 0; }
      }
      agent.territory = [];

      events.push({
        type: 'death',
        agent_id: agent.id,
        description: `${agent.name}이(가) 멸망했습니다.`,
      });
    }
  }

  const alive = state.agents.filter((a) => a.alive);
  if (alive.length === 1) {
    const winner = alive[0];
    state.status = 'completed';
    state.winner_id = winner.id;
    events.push({
      type: 'victory',
      agent_id: winner.id,
      description: `${winner.name}이(가) 천하를 통일했습니다!`,
    });
  } else if (state.turn >= state.max_turns) {
    // Most territory wins
    const ranked = alive.sort((a, b) => b.territory.length - a.territory.length);
    const winner = ranked[0];
    state.status = 'completed';
    state.winner_id = winner.id;
    events.push({
      type: 'victory',
      agent_id: winner.id,
      description: `최대 영토(${winner.territory.length}칸) — ${winner.name}이(가) 승리했습니다!`,
    });
  }
}

// ─── Single Turn Execution ────────────────────────────────────────────────────

export async function runTurn(
  state: SGGameState
): Promise<{ state: SGGameState; events: TurnEvent[] }> {
  if (state.status !== 'running') {
    return { state, events: [] };
  }

  state.turn++;
  const events: TurnEvent[] = [];

  // 1. Resource production
  events.push(...produceResources(state));

  // 2. Get AI decisions (parallel)
  let decisions: AgentDecision[];
  try {
    decisions = await getAgentDecisions(state);
  } catch {
    decisions = [];
  }

  // 3. Execute actions (EXPAND > RECRUIT > ATTACK order)
  const actionOrder: ['EXPAND', 'RECRUIT', 'ATTACK'] = ['EXPAND', 'RECRUIT', 'ATTACK'];
  for (const actionType of actionOrder) {
    for (const decision of decisions) {
      const agent = state.agents.find((a) => a.id === decision.agent_id);
      if (!agent || !agent.alive) continue;

      for (const action of decision.actions) {
        if (action.type === actionType) {
          executeAction(state, agent, action, events);
        }
      }
    }
  }

  // 4. Update survival stats
  for (const agent of state.agents) {
    if (agent.alive) agent.stats.turns_survived++;
  }

  // 5. Death & victory check
  checkDeathAndVictory(state, events);

  return { state, events };
}

// ─── Multi-Turn Execution ────────────────────────────────────────────────────

export async function runTurns(
  state: SGGameState,
  count: number
): Promise<{ state: SGGameState; allEvents: TurnEvent[][]; snapshots: SGGameState[] }> {
  const allEvents: TurnEvent[][] = [];
  const snapshots: SGGameState[] = [];

  for (let i = 0; i < count; i++) {
    if (state.status !== 'running') break;

    const { state: newState, events } = await runTurn(state);
    state = newState;
    allEvents.push(events);
    snapshots.push(JSON.parse(JSON.stringify(state))); // deep clone per turn
  }

  return { state, allEvents, snapshots };
}
