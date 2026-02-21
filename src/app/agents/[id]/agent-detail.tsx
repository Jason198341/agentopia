"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type Agent,
  type AgentStats,
  STAT_KEYS,
  STAT_LABELS,
  SPECIALTY_LABELS,
  type Specialty,
} from "@/types/agent";
import { useRouter } from "next/navigation";
import { useState } from "react";

function eloTier(elo: number) {
  if (elo >= 2000) return { name: "Diamond", color: "text-cyan-300" };
  if (elo >= 1600) return { name: "Platinum", color: "text-slate-300" };
  if (elo >= 1300) return { name: "Gold", color: "text-yellow-400" };
  if (elo >= 1100) return { name: "Silver", color: "text-gray-400" };
  if (elo >= 900) return { name: "Bronze", color: "text-amber-600" };
  return { name: "Iron", color: "text-stone-500" };
}

export function AgentDetail({
  agent,
  isOwner,
}: {
  agent: Agent;
  isOwner: boolean;
}) {
  const router = useRouter();
  const { deleteAgent } = useAgentStore();
  const [deleting, setDeleting] = useState(false);
  const tier = eloTier(agent.elo);
  const totalGames = agent.wins + agent.losses;
  const winRate = totalGames > 0 ? ((agent.wins / totalGames) * 100).toFixed(1) : "—";

  async function handleDelete() {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    setDeleting(true);
    await deleteAgent(agent.id);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; Dashboard
        </a>

        {/* Header */}
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{agent.name}</h1>
            <p className="text-sm text-text-muted">v{agent.version}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{agent.elo}</p>
            <p className={`text-sm font-medium ${tier.color}`}>{tier.name}</p>
          </div>
        </div>

        {/* Record */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="Wins" value={String(agent.wins)} color="text-success" />
          <StatCard label="Losses" value={String(agent.losses)} color="text-danger" />
          <StatCard label="Win Rate" value={`${winRate}%`} color="text-accent" />
        </div>

        {/* Stats Radar */}
        <section className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            Stats
          </h2>
          <div className="mt-3 space-y-2">
            {STAT_KEYS.map((key) => (
              <StatBar
                key={key}
                label={`${STAT_LABELS[key].emoji} ${STAT_LABELS[key].en}`}
                value={agent.stats[key]}
              />
            ))}
          </div>
        </section>

        {/* Specialties */}
        {agent.specialties.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Specialties
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.specialties.map((s) => {
                const label = SPECIALTY_LABELS[s as Specialty];
                return (
                  <span
                    key={s}
                    className="rounded-full bg-primary-dim px-3 py-1 text-sm text-primary"
                  >
                    {label?.emoji} {label?.en ?? s}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Traits */}
        {Object.keys(agent.traits).length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Evolved Traits
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(agent.traits).map(([trait, value]) => (
                <span
                  key={trait}
                  className={`rounded-full px-3 py-1 text-sm ${
                    value > 0
                      ? "bg-success/15 text-success"
                      : "bg-danger/15 text-danger"
                  }`}
                >
                  {trait} {value > 0 ? `+${value}` : value}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <div className="mt-8 flex gap-3">
            <a
              href={`/agents/${agent.id}/edit`}
              className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              Edit Agent
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-danger/30 px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-text-muted">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-border">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-mono text-sm font-bold text-primary">
        {value}
      </span>
    </div>
  );
}
