"use client";

import type { SGAgent } from '@/types/sangokji';

interface AgentPanelProps {
  agents: SGAgent[];
}

export function AgentPanel({ agents }: AgentPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
        세력 현황
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: SGAgent }) {
  const eliminated = !agent.alive;

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        eliminated ? 'opacity-40' : ''
      }`}
      style={{
        borderColor: `${agent.color}40`,
        backgroundColor: `${agent.color}0d`,
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: eliminated ? '#6b7280' : agent.color }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-text truncate">{agent.name}</span>
            {eliminated && (
              <span className="text-xs text-red-400 flex-shrink-0">멸망</span>
            )}
          </div>
          <span className="text-xs text-text-muted">{agent.personality}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <StatRow label="영토" value={`${agent.territory.length}칸`} color={agent.color} />
        <StatRow label="병력" value={`${agent.troops}명`} color={agent.color} />
        <StatRow label="🌾 식량" value={agent.resources.food} />
        <StatRow label="💰 금" value={agent.resources.gold} />
        <StatRow label="전승" value={agent.stats.battles_won} />
        <StatRow label="생존" value={`${agent.stats.turns_survived}턴`} />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-muted">{label}</span>
      <span
        className="font-medium"
        style={{ color: color ?? 'var(--text)' }}
      >
        {value}
      </span>
    </div>
  );
}
