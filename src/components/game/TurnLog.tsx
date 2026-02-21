"use client";

import type { TurnEvent } from '@/types/sangokji';

interface TurnLogProps {
  turnEvents: { turn: number; events: TurnEvent[] }[];
  agents?: { id: string; color: string; name: string }[];
}

const EVENT_ICON: Record<string, string> = {
  expand:   '🏳️',
  battle:   '⚔️',
  recruit:  '🪖',
  death:    '💀',
  victory:  '👑',
  resource: '📦',
  info:     'ℹ️',
};

export function TurnLog({ turnEvents, agents = [] }: TurnLogProps) {
  const colorMap = Object.fromEntries(agents.map((a) => [a.id, a.color]));
  const nameMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  const nonResourceEvents = turnEvents
    .map((te) => ({
      ...te,
      events: te.events.filter((e) => e.type !== 'resource'),
    }))
    .filter((te) => te.events.length > 0)
    .slice(-5) // last 5 turns
    .reverse();

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
        전황 기록
      </h2>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {nonResourceEvents.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            아직 이벤트가 없습니다. 턴을 실행하세요.
          </p>
        ) : (
          nonResourceEvents.map((te) => (
            <div key={te.turn}>
              <div className="mb-1 text-xs font-semibold text-text-muted">
                — {te.turn}턴 —
              </div>
              <div className="space-y-1">
                {te.events.map((event, i) => (
                  <EventRow
                    key={i}
                    event={event}
                    color={colorMap[event.agent_id]}
                    agentName={nameMap[event.agent_id]}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  color,
  agentName: _agentName,
}: {
  event: TurnEvent;
  color?: string;
  agentName?: string;
}) {
  const icon = EVENT_ICON[event.type] ?? '·';
  const isHighlight = event.type === 'victory' || event.type === 'death';

  return (
    <div
      className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
        isHighlight ? 'bg-surface-hover' : ''
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span
        className="leading-relaxed"
        style={{ color: color ?? 'var(--text-muted)' }}
      >
        {event.description}
      </span>
    </div>
  );
}
