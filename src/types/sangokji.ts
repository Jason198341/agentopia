// ─── AI 삼국지 TypeScript Types ───────────────────────────────────────────────

export type Terrain = 'plain' | 'forest' | 'mountain';
export type ActionType = 'EXPAND' | 'RECRUIT' | 'ATTACK' | 'DEFEND';
export type GameStatus = 'running' | 'completed';

export interface Tile {
  x: number;
  y: number;
  terrain: Terrain;
  owner: string | null;   // agent_id or null
  garrison: number;       // troops stationed on this tile
}

export interface SGAgent {
  id: string;             // "agent_0" ~ "agent_3"
  name: string;
  color: string;          // hex color
  resources: { food: number; gold: number };
  troops: number;         // total troops across all tiles
  territory: string[];    // "x,y" key strings
  capital: string;        // "x,y" key of starting tile
  strategy: string;
  personality: string;
  alive: boolean;
  stats: { battles_won: number; turns_survived: number };
}

export interface SGGameState {
  game_id: string;
  turn: number;
  max_turns: number;
  tiles: Tile[][];        // [y][x] indexed
  agents: SGAgent[];
  status: GameStatus;
  winner_id: string | null;
}

export interface AgentAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface AgentDecision {
  agent_id: string;
  reasoning: string;
  actions: AgentAction[];
}

export interface TurnEvent {
  type: 'expand' | 'battle' | 'recruit' | 'death' | 'victory' | 'resource' | 'info';
  agent_id: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface GameConfig {
  mapSize: number;
  maxTurns: number;
  initialFood: number;
  initialGold: number;
  initialTroops: number;
}

export interface BattleResult {
  winner: 'attacker' | 'defender';
  attackerLoss: number;
  defenderLoss: number;
}
