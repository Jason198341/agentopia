"use client";

import type { SGGameState, Tile, Terrain } from '@/types/sangokji';

interface GameMapProps {
  state: SGGameState;
}

const TERRAIN_LABEL: Record<Terrain, string> = {
  plain: '들',
  forest: '숲',
  mountain: '산',
};

const TERRAIN_BG: Record<Terrain, string> = {
  plain: 'rgba(255,255,255,0.03)',
  forest: 'rgba(34,197,94,0.08)',
  mountain: 'rgba(107,114,128,0.15)',
};

export function GameMap({ state }: GameMapProps) {
  const agentColorMap: Record<string, string> = {};
  const agentNameMap: Record<string, string> = {};

  for (const a of state.agents) {
    agentColorMap[a.id] = a.color;
    agentNameMap[a.id] = a.name;
  }

  const size = state.tiles.length;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
        전략 지도 (턴 {state.turn}/{state.max_turns})
      </h2>

      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          aspectRatio: '1 / 1',
        }}
      >
        {state.tiles.flatMap((row) =>
          row.map((tile) => <MapTile key={`${tile.x},${tile.y}`} tile={tile} agentColorMap={agentColorMap} agentNameMap={agentNameMap} />)
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {state.agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-1">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: agent.alive ? agent.color : '#4b5563' }}
            />
            <span className={`text-xs ${agent.alive ? 'text-text' : 'text-text-muted line-through'}`}>
              {agent.name}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-gray-600/40" />
          <span className="text-xs text-text-muted">산</span>
        </div>
      </div>
    </div>
  );
}

function MapTile({
  tile,
  agentColorMap,
  agentNameMap,
}: {
  tile: Tile;
  agentColorMap: Record<string, string>;
  agentNameMap: Record<string, string>;
}) {
  const isMountain = tile.terrain === 'mountain';
  const ownerColor = tile.owner ? agentColorMap[tile.owner] : null;

  return (
    <div
      className="relative flex items-center justify-center rounded-md border text-xs font-bold transition-all"
      style={{
        backgroundColor: isMountain
          ? 'rgba(107,114,128,0.2)'
          : ownerColor
          ? `${ownerColor}30`
          : TERRAIN_BG[tile.terrain],
        borderColor: ownerColor ? `${ownerColor}60` : 'rgba(255,255,255,0.08)',
        aspectRatio: '1 / 1',
        minHeight: '44px',
      }}
      title={`[${tile.x},${tile.y}] ${TERRAIN_LABEL[tile.terrain]}${tile.owner ? ` — ${agentNameMap[tile.owner] ?? tile.owner}` : ''}${tile.garrison > 0 ? ` (${tile.garrison}명)` : ''}`}
    >
      {isMountain ? (
        <span className="text-gray-500">⛰</span>
      ) : (
        <>
          {tile.garrison > 0 && (
            <span
              className="text-xs font-bold"
              style={{ color: ownerColor ?? '#9ca3af' }}
            >
              {tile.garrison}
            </span>
          )}
          {tile.garrison === 0 && !tile.owner && (
            <span className="text-gray-600 text-xs">
              {tile.terrain === 'forest' ? '🌲' : '·'}
            </span>
          )}
        </>
      )}

      {/* Small dot for owned but no garrison */}
      {tile.owner && tile.garrison === 0 && (
        <div
          className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: ownerColor ?? '#9ca3af' }}
        />
      )}
    </div>
  );
}
