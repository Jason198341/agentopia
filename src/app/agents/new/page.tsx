"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type AgentStats,
  type AgentPersonality,
  type Specialty,
  type SpeakingStyle,
  type DebatePhilosophy,
  type StrategyPattern,
  PRESETS,
  SPECIALTIES,
  SPECIALTY_LABELS,
  STAT_BUDGET,
  STAT_KEYS,
  STAT_LABELS,
  SPEAKING_STYLES,
  DEBATE_PHILOSOPHIES,
  STRATEGY_PATTERNS,
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
  const [personality, setPersonality] = useState<AgentPersonality>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const createAgent = useAgentStore((s) => s.createAgent);

  const totalPoints = STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);
  const overBudget = totalPoints > STAT_BUDGET;
  const remaining = STAT_BUDGET - totalPoints;

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

    const agent = await createAgent(name.trim(), stats, specialties, personality);
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
          &larr; 대시보드
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">에이전트 생성</h1>
        <p className="mt-1 text-sm text-text-muted">
          AI 토론자를 설계하세요. 8개 스탯을 조절해 성격을 만드세요.
        </p>

        {/* Presets */}
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            빠른 프리셋
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
              에이전트 이름
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="예: DeepThink-7"
            />
          </div>

          {/* 8 Stats */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-muted">스탯 (1-10)</p>
              <p className={`text-xs ${overBudget ? "text-danger font-bold" : "text-text-muted"}`}>
                <span className="font-mono text-text">{totalPoints}</span>/{STAT_BUDGET}
                {overBudget
                  ? ` (${-remaining} 초과!)`
                  : remaining > 0
                    ? ` (${remaining} 남음)`
                    : ""}
              </p>
            </div>
            {overBudget && (
              <p className="mt-1 text-xs text-danger">
                포인트 초과! 일부 스탯을 낮춰야 배치할 수 있습니다.
              </p>
            )}
            <div className="mt-3 space-y-3">
              {STAT_KEYS.map((key) => {
                const label = STAT_LABELS[key];
                const value = stats[key];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-6 text-center text-lg">{label.emoji}</span>
                    <span className="w-24 text-sm text-text-muted">{label.ko}</span>
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
              전문 분야 (최대 3개)
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
                    {label.emoji} {label.ko}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Debate Style */}
          <div>
            <p className="text-sm font-medium text-text-muted">
              발화 스타일 <span className="text-text-muted/50">(선택)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPEAKING_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setPersonality((p) => ({
                      ...p,
                      speaking_style: p.speaking_style === s.id ? undefined : s.id,
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    personality.speaking_style === s.id
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
                  }`}
                >
                  {s.emoji} {s.ko}
                </button>
              ))}
            </div>
          </div>

          {/* Debate Philosophy */}
          <div>
            <p className="text-sm font-medium text-text-muted">
              토론 철학 <span className="text-text-muted/50">(선택)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEBATE_PHILOSOPHIES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setPersonality((prev) => ({
                      ...prev,
                      debate_philosophy: prev.debate_philosophy === p.id ? undefined : p.id,
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    personality.debate_philosophy === p.id
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
                  }`}
                >
                  {p.emoji} {p.ko}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Pattern */}
          <div>
            <p className="text-sm font-medium text-text-muted">
              전략 패턴 <span className="text-text-muted/50">(선택)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STRATEGY_PATTERNS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setPersonality((p) => ({
                      ...p,
                      strategy: p.strategy === s.id ? undefined : s.id,
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    personality.strategy === s.id
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
                  }`}
                >
                  {s.emoji} {s.ko}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label htmlFor="custom" className="block text-sm font-medium text-text-muted">
              커스텀 지시사항 <span className="text-text-muted/50">(선택, 최대 200자)</span>
            </label>
            <textarea
              id="custom"
              maxLength={200}
              rows={2}
              value={personality.custom_instructions ?? ""}
              onChange={(e) =>
                setPersonality((p) => ({
                  ...p,
                  custom_instructions: e.target.value || undefined,
                }))
              }
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="예: 항상 수사적 질문으로 마무리하라"
            />
            <p className="mt-1 text-right text-xs text-text-muted">
              {personality.custom_instructions?.length ?? 0}/200
            </p>
          </div>

          {/* Stat Summary */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              성격 미리보기
            </p>
            <p className="mt-2 text-sm text-text">
              {describeAgent(stats)}
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim() || overBudget}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "생성 중…" : overBudget ? `포인트 초과 (${-remaining})` : "에이전트 배치"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Generate a human-readable personality description from stats. */
function describeAgent(stats: AgentStats): string {
  const traits: string[] = [];

  if (stats.logic >= 8) traits.push("체계적이고 근거 중심");
  else if (stats.logic <= 3) traits.push("직감형");

  if (stats.aggression >= 8) traits.push("공격적 대립형");
  else if (stats.aggression <= 3) traits.push("외교적 절제형");

  if (stats.humor >= 7) traits.push("재치 있는");
  if (stats.boldness >= 8) traits.push("도발적이고 대담한");
  if (stats.creativity >= 8) traits.push("비유를 자유자재로 쓰는");
  if (stats.knowledge >= 8) traits.push("깊은 지식을 갖춘");
  if (stats.adaptability >= 8) traits.push("상대 스타일에 빠르게 적응하는");
  if (stats.brevity >= 8) traits.push("칼날같이 간결한");
  else if (stats.brevity <= 3) traits.push("정교하고 상세한");

  if (traits.length === 0) traits.push("모든 영역에서 균형 잡힌");

  return `이 에이전트는 ${traits.join(", ")} 성향입니다.`;
}
