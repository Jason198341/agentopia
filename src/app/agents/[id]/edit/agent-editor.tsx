"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type Agent,
  type AgentStats,
  type Specialty,
  SPECIALTIES,
  SPECIALTY_LABELS,
  STAT_KEYS,
  STAT_LABELS,
} from "@/types/agent";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentEditor({ agent }: { agent: Agent }) {
  const [name, setName] = useState(agent.name);
  const [stats, setStats] = useState<AgentStats>({ ...agent.stats });
  const [specialties, setSpecialties] = useState<Specialty[]>([...agent.specialties]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const totalPoints = STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);

  // Track what changed for the diff display
  const changedStats = STAT_KEYS.filter((k) => stats[k] !== agent.stats[k]);
  const hasChanges =
    name !== agent.name ||
    changedStats.length > 0 ||
    JSON.stringify(specialties) !== JSON.stringify(agent.specialties);

  function setStat(key: keyof AgentStats, value: number) {
    setStats((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev,
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !hasChanges) return;
    setError(null);
    setSaving(true);

    const ok = await updateAgent(agent.id, {
      name: name.trim(),
      stats,
      specialties,
    });

    if (!ok) {
      setError(useAgentStore.getState().error ?? "Failed to save");
      setSaving(false);
      return;
    }

    router.push(`/agents/${agent.id}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a
          href={`/agents/${agent.id}`}
          className="text-sm text-text-muted hover:text-text"
        >
          &larr; Back to {agent.name}
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">Edit Agent</h1>
        <p className="mt-1 text-sm text-text-muted">
          Re-tune your agent&apos;s stats to change its debate personality.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-muted">
              Agent Name
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 8 Stats with diff indicators */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted">Stats (1-10)</p>
              <p className="text-xs text-text-muted">
                Total: <span className="font-mono text-text">{totalPoints}</span>/80
              </p>
            </div>
            <div className="mt-3 space-y-3">
              {STAT_KEYS.map((key) => {
                const label = STAT_LABELS[key];
                const value = stats[key];
                const original = agent.stats[key];
                const diff = value - original;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-6 text-center text-lg">{label.emoji}</span>
                    <span className="w-24 text-sm text-text-muted">{label.en}</span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={value}
                      onChange={(e) => setStat(key, Number(e.target.value))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
                    />
                    <span className="w-8 text-right font-mono text-sm font-bold text-primary">
                      {value}
                    </span>
                    {diff !== 0 && (
                      <span
                        className={`w-10 text-right font-mono text-xs font-bold ${diff > 0 ? "text-success" : "text-danger"}`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <p className="text-sm font-medium text-text-muted">Specialties (max 3)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const selected = specialties.includes(s);
                const label = SPECIALTY_LABELS[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`rounded-full px-3 py-1 text-sm transition ${
                      selected
                        ? "bg-primary text-white"
                        : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
                    } ${!selected && specialties.length >= 3 ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {label.emoji} {label.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Change Summary */}
          {hasChanges && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-warning">
                Changes
              </p>
              <ul className="mt-2 space-y-1 text-sm text-text">
                {name !== agent.name && (
                  <li>
                    Name: {agent.name} &rarr; {name}
                  </li>
                )}
                {changedStats.map((k) => (
                  <li key={k}>
                    {STAT_LABELS[k].emoji} {STAT_LABELS[k].en}: {agent.stats[k]} &rarr;{" "}
                    {stats[k]}
                  </li>
                ))}
                {JSON.stringify(specialties) !== JSON.stringify(agent.specialties) && (
                  <li>Specialties updated</li>
                )}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim() || !hasChanges}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
