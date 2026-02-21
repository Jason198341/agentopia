"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type Agent,
  type AgentPersonality,
  type TurnStrategies,
  type StrategyPresetId,
  type Specialty,
  SPECIALTIES,
  SPECIALTY_LABELS,
  SPEAKING_STYLES,
  DEBATE_PHILOSOPHIES,
  STRATEGY_PATTERNS,
  STRATEGY_PRESETS,
  STRATEGY_PRESET_IDS,
  TURN_LABELS,
  EMPTY_STRATEGIES,
  getPersonality,
  getTurnStrategies,
} from "@/types/agent";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgentEditor({ agent }: { agent: Agent }) {
  const [name, setName]               = useState(agent.name);
  const [specialties, setSpecialties] = useState<Specialty[]>([...agent.specialties]);
  const [personality, setPersonality] = useState<AgentPersonality>(() => getPersonality(agent));
  const [turnStrategies, setTurnStrategies] = useState<TurnStrategies>(
    () => getTurnStrategies(agent) ?? { ...EMPTY_STRATEGIES },
  );
  const [activePreset, setActivePreset] = useState<StrategyPresetId | "custom" | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const router      = useRouter();
  const updateAgent = useAgentStore((s) => s.updateAgent);

  const originalPersonality     = getPersonality(agent);
  const originalTurnStrategies  = getTurnStrategies(agent) ?? { ...EMPTY_STRATEGIES };

  const hasChanges =
    name !== agent.name ||
    JSON.stringify(specialties)    !== JSON.stringify(agent.specialties) ||
    JSON.stringify(personality)    !== JSON.stringify(originalPersonality) ||
    JSON.stringify(turnStrategies) !== JSON.stringify(originalTurnStrategies);

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev,
    );
  }

  function applyStrategyPreset(presetId: StrategyPresetId) {
    setTurnStrategies({ ...STRATEGY_PRESETS[presetId].strategies });
    setActivePreset(presetId);
  }

  function setTurnStrategy(key: keyof TurnStrategies, value: string) {
    setTurnStrategies((prev) => ({ ...prev, [key]: value }));
    setActivePreset("custom");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !hasChanges) return;
    setError(null);
    setSaving(true);

    const ok = await updateAgent(agent.id, {
      name: name.trim(),
      stats: agent.stats, // stats unchanged (no sliders)
      specialties,
      personality,
      turnStrategies,
    });

    if (!ok) {
      setError(useAgentStore.getState().error ?? "저장 실패");
      setSaving(false);
      return;
    }

    router.push(`/agents/${agent.id}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href={`/agents/${agent.id}`} className="text-sm text-text-muted hover:text-text">
          &larr; {agent.name}으로 돌아가기
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">에이전트 수정</h1>
        <p className="mt-1 text-sm text-text-muted">
          토론 전략과 성격을 수정하세요.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-6">

          {/* ── 이름 ── */}
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

          {/* ── 📝 턴별 전략 (메인) ── */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-text">📝 턴별 토론 전략</p>
            <p className="mt-0.5 text-xs text-text-muted">
              각 턴의 전략을 한국어로 수정하세요. AI 행동에 가장 큰 영향을 줍니다.
            </p>

            {/* 전략 프리셋 */}
            <div className="mt-3 flex flex-wrap gap-2">
              {STRATEGY_PRESET_IDS.map((id) => {
                const preset = STRATEGY_PRESETS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyStrategyPreset(id)}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      activePreset === id
                        ? "bg-accent text-white"
                        : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
                    }`}
                  >
                    {preset.emoji} {preset.ko}
                  </button>
                );
              })}
              {activePreset && (
                <button
                  type="button"
                  onClick={() => { setTurnStrategies({ ...originalTurnStrategies }); setActivePreset(null); }}
                  className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition hover:bg-surface-hover"
                >
                  원래대로
                </button>
              )}
            </div>

            {/* 턴별 텍스트창 */}
            <div className="mt-4 space-y-4">
              {(Object.keys(TURN_LABELS) as (keyof TurnStrategies)[]).map((key) => {
                const label = TURN_LABELS[key];
                return (
                  <div key={key}>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xs font-semibold text-text">{label.ko}</p>
                      <p className="text-[10px] text-text-muted">{label.guide}</p>
                    </div>
                    <textarea
                      maxLength={200}
                      rows={2}
                      value={turnStrategies[key]}
                      onChange={(e) => setTurnStrategy(key, e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="이 턴의 전략을 한국어로 작성하세요..."
                    />
                    <p className="mt-0.5 text-right text-[10px] text-text-muted">
                      {turnStrategies[key].length}/200
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 발화 스타일 ── */}
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

          {/* ── 토론 철학 ── */}
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

          {/* ── 전략 패턴 ── */}
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

          {/* ── 전문 분야 ── */}
          <div>
            <p className="text-sm font-medium text-text-muted">
              전문 분야 <span className="text-text-muted/50">(최대 3개)</span>
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
                    } ${!selected && specialties.length >= 3 ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {label.emoji} {label.ko}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 커스텀 지시사항 ── */}
          <div>
            <label htmlFor="custom" className="block text-sm font-medium text-text-muted">
              추가 지시사항 <span className="text-text-muted/50">(선택, 최대 200자)</span>
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
          </div>

          {/* ── 변경 사항 ── */}
          {hasChanges && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-warning">변경 사항 있음</p>
              <ul className="mt-2 space-y-1 text-sm text-text">
                {name !== agent.name && <li>이름: {agent.name} → {name}</li>}
                {JSON.stringify(specialties) !== JSON.stringify(agent.specialties) && <li>전문 분야 변경됨</li>}
                {JSON.stringify(personality) !== JSON.stringify(originalPersonality) && <li>토론 성격 변경됨</li>}
                {JSON.stringify(turnStrategies) !== JSON.stringify(originalTurnStrategies) && <li>턴별 전략 변경됨</li>}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim() || !hasChanges}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "저장 중..." : "변경 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}
