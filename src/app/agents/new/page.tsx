"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type AgentStats,
  type Specialty,
  PRESETS,
  SPECIALTIES,
  SPECIALTY_LABELS,
  STAT_KEYS,
  STAT_LABELS,
} from "@/types/agent";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEFAULT_STATS: AgentStats = {
  logic: 5,
  aggression: 5,
  brevity: 5,
  humor: 5,
  boldness: 5,
  creativity: 5,
  knowledge: 5,
  adaptability: 5,
};

export default function NewAgentPage() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState<AgentStats>({ ...DEFAULT_STATS });
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const createAgent = useAgentStore((s) => s.createAgent);

  const totalPoints = STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);

  function setStat(key: keyof AgentStats, value: number) {
    setStats((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev,
    );
  }

  function applyPreset(index: number) {
    const p = PRESETS[index];
    setStats({ ...p.stats });
    setSpecialties([...p.specialties]);
    if (!name) setName(p.name);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);

    const agent = await createAgent(name.trim(), stats, specialties);
    if (!agent) {
      setError(useAgentStore.getState().error ?? "Failed to create agent");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; Back to Dashboard
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">Create Agent</h1>
        <p className="mt-1 text-sm text-text-muted">
          Design your AI debater. Tune the 8 stats to shape its personality.
        </p>

        {/* Presets */}
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Quick Presets
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(i)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text transition hover:bg-surface-hover"
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-6 space-y-6">
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
              placeholder="e.g. DeepThink-7"
            />
          </div>

          {/* 8 Stats */}
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <p className="text-sm font-medium text-text-muted">
              Specialties (max 3)
            </p>
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
                    } ${!selected && specialties.length >= 3 ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {label.emoji} {label.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stat Summary */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Personality Preview
            </p>
            <p className="mt-2 text-sm text-text">
              {describeAgent(stats)}
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Creating…" : "Deploy Agent"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Generate a human-readable personality description from stats. */
function describeAgent(stats: AgentStats): string {
  const traits: string[] = [];

  if (stats.logic >= 8) traits.push("methodical and evidence-driven");
  else if (stats.logic <= 3) traits.push("intuition-based");

  if (stats.aggression >= 8) traits.push("aggressively confrontational");
  else if (stats.aggression <= 3) traits.push("diplomatically restrained");

  if (stats.humor >= 7) traits.push("witty");
  if (stats.boldness >= 8) traits.push("fearlessly provocative");
  if (stats.creativity >= 8) traits.push("wildly creative with analogies");
  if (stats.knowledge >= 8) traits.push("deeply knowledgeable");
  if (stats.adaptability >= 8) traits.push("highly adaptive to opponent style");
  if (stats.brevity >= 8) traits.push("razor-sharp and concise");
  else if (stats.brevity <= 3) traits.push("elaborate and detailed");

  if (traits.length === 0) traits.push("balanced across all dimensions");

  return `This agent is ${traits.join(", ")}.`;
}
