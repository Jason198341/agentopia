import type { Tile, Terrain, SGAgent } from '@/types/sangokji';

// Terrain distribution weights
const TERRAIN_WEIGHTS: [Terrain, number][] = [
  ['plain',    60],
  ['forest',   25],
  ['mountain', 15],
];

function pickTerrain(): Terrain {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const [terrain, weight] of TERRAIN_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return terrain;
  }
  return 'plain';
}

/**
 * Generate a size×size map with random terrain.
 * Corners are always 'plain' (agent starting positions).
 * Mountains cannot be occupied.
 */
export function generateMap(size = 5): Tile[][] {
  const tiles: Tile[][] = [];
  const corners = new Set([
    '0,0', `${size - 1},0`, `0,${size - 1}`, `${size - 1},${size - 1}`,
  ]);

  for (let y = 0; y < size; y++) {
    tiles[y] = [];
    for (let x = 0; x < size; x++) {
      const key = `${x},${y}`;
      tiles[y][x] = {
        x,
        y,
        terrain: corners.has(key) ? 'plain' : pickTerrain(),
        owner: null,
        garrison: 0,
      };
    }
  }

  return tiles;
}

const TERRAIN_CHAR: Record<Terrain, string> = {
  plain: '.',
  forest: 'F',
  mountain: '#',
};

/**
 * Render ASCII map from a specific agent's perspective.
 * Own tiles: uppercase letter, enemy tiles: lowercase, neutral: terrain char.
 */
export function toASCII(tiles: Tile[][], agentId: string): string {
  const agentIndex = parseInt(agentId.replace('agent_', ''), 10);
  const letter = String.fromCharCode(65 + agentIndex); // A,B,C,D

  const rows = tiles.map((row) =>
    row.map((tile) => {
      if (tile.terrain === 'mountain') return '#';
      if (!tile.owner) return TERRAIN_CHAR[tile.terrain];
      if (tile.owner === agentId) return letter;
      const idx = parseInt(tile.owner.replace('agent_', ''), 10);
      return String.fromCharCode(97 + idx); // a,b,c,d (enemy)
    }).join(' ')
  );

  return rows.join('\n');
}

/**
 * Get tile by "x,y" key string.
 */
export function getTile(tiles: Tile[][], key: string): Tile | null {
  const [x, y] = key.split(',').map(Number);
  return tiles[y]?.[x] ?? null;
}

/**
 * Get all tiles adjacent (4-directional) to a given "x,y" key.
 */
export function getAdjacentTiles(tiles: Tile[][], key: string): Tile[] {
  const [x, y] = key.split(',').map(Number);
  const size = tiles.length;
  const adjacent: Tile[] = [];

  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < size && ny >= 0 && ny < tiles[0].length) {
      adjacent.push(tiles[ny][nx]);
    }
  }

  return adjacent;
}

/**
 * Get all tiles owned by the given agent that border at least one non-mountain
 * tile not owned by the agent (candidates for EXPAND or ATTACK).
 */
export function getFrontierTiles(tiles: Tile[][], agent: SGAgent): Tile[] {
  const frontier: Tile[] = [];

  for (const key of agent.territory) {
    const adj = getAdjacentTiles(tiles, key);
    const hasNonOwnedNeighbor = adj.some(
      (t) => t.terrain !== 'mountain' && t.owner !== agent.id
    );
    if (hasNonOwnedNeighbor) {
      const tile = getTile(tiles, key);
      if (tile) frontier.push(tile);
    }
  }

  return frontier;
}
