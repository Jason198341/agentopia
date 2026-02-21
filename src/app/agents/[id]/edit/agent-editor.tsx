"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type Agent,
  type AgentStats,
  type AgentPersonality,
  type Specialty,
  SPECIALTIES,
  SPECIALTY_LABELS,
  STAT_BUDGET,
  STAT_KEYS,
  STAT_LABELS,
  SPEAKING_STYLES,
  DEBATE_PHILOSOPHIES,
  STRATEGY_PATTERNS,
  getPersonality,
} from "@/types/agent";
import { STAT_PROMPTS, tier, type Tier } from "@/data/prompts/battle";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentEditor({ agent }: { agent: Agent }) {
  const [name, setName] = useState(agent.name);
  const [stats, setStats] = useState<AgentStats>({ ...agent.stats });
  const [specialties, setSpecialties] = useState<Specialty[]>([...agent.specialties]);
  const [personality, setPersonality] = useState<AgentPersonality>(() => getPersonality(agent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStat, setExpandedStat] = useState<keyof AgentStats | null>(null);
  const router = useRouter();
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const totalPoints = STAT_KEYS.reduce((sum, k) => sum + stats[k], 0);
  const overBudget = totalPoints > STAT_BUDGET;
  const remaining = STAT_BUDGET - totalPoints;

  // Track what changed for the diff display
  const changedStats = STAT_KEYS.filter((k) => stats[k] !== agent.stats[k]);
  const originalPersonality = getPersonality(agent);
  const personalityChanged = JSON.stringify(personality) !== JSON.stringify(originalPersonality);
  const hasChanges =
    name !== agent.name ||
    changedStats.length > 0 ||
    JSON.stringify(specialties) !== JSON.stringify(agent.specialties) ||
    personalityChanged;

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
      personality,
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
          &larr; {agent.name}으로 돌아가기
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">에이전트 수정</h1>
        <p className="mt-1 text-sm text-text-muted">
          스탯을 재조정해서 토론 성격을 바꿔보세요.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-6">
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
            />
          </div>

          {/* 8 Stats with diff indicators */}
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
                포인트 초과! 일부 스탯을 낮춰야 저장할 수 있습니다.
              </p>
            )}
            <div className="mt-3 space-y-1">
              {STAT_KEYS.map((key) => {
                const label = STAT_LABELS[key];
                const value = stats[key];
                const original = agent.stats[key];
                const diff = value - original;
                const currentTier = tier(value);
                const isExpanded = expandedStat === key;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-lg">{label.emoji}</span>
                      <span className="w-24 text-sm text-text-muted">{label.ko}</span>
                      <div className="relative flex-1">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={value}
                          onChange={(e) => setStat(key, Number(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
                        />
                        {/* Tier threshold markers at 4, 7, 9 */}
                        <div className="pointer-events-none absolute -top-1 left-0 flex w-full justify-between px-[3px]">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <span
                              key={n}
                              className={`h-1 w-0.5 ${
                                n === 4 || n === 7 || n === 9
                                  ? "bg-warning"
                                  : "bg-transparent"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="w-8 text-right font-mono text-sm font-bold text-primary">
                        {value}
                      </span>
                      <span
                        className={`w-12 rounded px-1 text-center text-[10px] font-bold uppercase ${
                          currentTier === "low"
                            ? "bg-danger/15 text-danger"
                            : currentTier === "extreme"
                              ? "bg-accent/15 text-accent"
                              : currentTier === "high"
                                ? "bg-success/15 text-success"
                                : "bg-warning/15 text-warning"
                        }`}
                      >
                        {currentTier}
                      </span>
                      {diff !== 0 && (
                        <span
                          className={`w-8 text-right font-mono text-xs font-bold ${diff > 0 ? "text-success" : "text-danger"}`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedStat(isExpanded ? null : key)}
                        className="text-xs text-text-muted hover:text-text"
                        title="이 스탯의 효과 보기"
                      >
                        {isExpanded ? "▲" : "?"}
                      </button>
                    </div>
                    {/* Expanded: show all tier effects */}
                    {isExpanded && (
                      <div className="mb-2 ml-9 mt-1 space-y-1 rounded-lg border border-border bg-surface/50 p-3">
                        {(["low", "mid", "high", "extreme"] as Tier[]).map((t) => {
                          const isCurrent = t === currentTier;
                          const range = t === "low" ? "1-3" : t === "mid" ? "4-6" : t === "high" ? "7-8" : "9-10";
                          return (
                            <div
                              key={t}
                              className={`rounded-md px-2 py-1.5 text-xs ${
                                isCurrent
                                  ? "border border-primary/30 bg-primary/10 text-text"
                                  : "text-text-muted"
                              }`}
                            >
                              <span className="font-mono font-bold">[{range}]</span>{" "}
                              <span className={`font-semibold uppercase ${
                                isCurrent ? "text-primary" : ""
                              }`}>
                                {t}
                              </span>
                              : {STAT_PROMPTS[key][t]}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <p className="text-sm font-medium text-text-muted">전문 분야 (최대 3개)</p>
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
                    {label.emoji} {label.ko}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speaking Style */}
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

          {/* Change Summary */}
          {hasChanges && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-warning">
                변경 사항
              </p>
              <ul className="mt-2 space-y-1 text-sm text-text">
                {name !== agent.name && (
                  <li>
                    이름: {agent.name} &rarr; {name}
                  </li>
                )}
                {changedStats.map((k) => (
                  <li key={k}>
                    {STAT_LABELS[k].emoji} {STAT_LABELS[k].ko}: {agent.stats[k]} &rarr;{" "}
                    {stats[k]}
                  </li>
                ))}
                {JSON.stringify(specialties) !== JSON.stringify(agent.specialties) && (
                  <li>전문 분야 변경됨</li>
                )}
                {personalityChanged && (
                  <li>토론 성격 변경됨</li>
                )}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim() || !hasChanges || overBudget}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "저장 중..." : overBudget ? `포인트 초과 (${-remaining})` : "변경 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}
