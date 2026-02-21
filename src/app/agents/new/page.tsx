"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type AgentStats,
  type AgentPersonality,
  type TurnStrategies,
  type StrategyPresetId,
  type Specialty,
  PRESETS,
  SPECIALTIES,
  SPECIALTY_LABELS,
  SPEAKING_STYLES,
  DEBATE_PHILOSOPHIES,
  STRATEGY_PATTERNS,
  STRATEGY_PRESETS,
  STRATEGY_PRESET_IDS,
  TURN_LABELS,
  EMPTY_STRATEGIES,
} from "@/types/agent";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEFAULT_STATS: AgentStats = {
  logic: 5, aggression: 5, brevity: 5, humor: 5,
  boldness: 5, creativity: 5, knowledge: 5, adaptability: 5,
};

export default function NewAgentPage() {
  const [name, setName]                   = useState("");
  const [stats, setStats]                 = useState<AgentStats>({ ...DEFAULT_STATS });
  const [specialties, setSpecialties]     = useState<Specialty[]>([]);
  const [personality, setPersonality]     = useState<AgentPersonality>({});
  const [turnStrategies, setTurnStrategies] = useState<TurnStrategies>({ ...EMPTY_STRATEGIES });
  const [activePreset, setActivePreset]   = useState<StrategyPresetId | "custom" | null>(null);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const router     = useRouter();
  const createAgent = useAgentStore((s) => s.createAgent);

  function applyAgentPreset(index: number) {
    const p = PRESETS[index];
    setStats({ ...p.stats });
    setSpecialties([...p.specialties]);
    if (!name) setName(p.name);
    // 프리셋에 맞는 기본 전략도 자동 적용
    const defaultStrategies = STRATEGY_PRESETS[p.defaultStrategy].strategies;
    setTurnStrategies({ ...defaultStrategies });
    setActivePreset(p.defaultStrategy);
  }

  function applyStrategyPreset(presetId: StrategyPresetId) {
    setTurnStrategies({ ...STRATEGY_PRESETS[presetId].strategies });
    setActivePreset(presetId);
  }

  function setTurnStrategy(key: keyof TurnStrategies, value: string) {
    setTurnStrategies((prev) => ({ ...prev, [key]: value }));
    setActivePreset("custom");
  }

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev,
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSaving(true);

    const agent = await createAgent(name.trim(), stats, specialties, personality, turnStrategies);
    if (!agent) {
      setError(useAgentStore.getState().error ?? "생성 실패");
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
          토론 전략을 직접 작성해 에이전트의 성격을 설계하세요.
        </p>

        <form onSubmit={handleCreate} className="mt-6 space-y-6">

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
              placeholder="예: 논리왕-7호"
            />
          </div>

          {/* ── 빠른 프리셋 ── */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              빠른 프리셋 <span className="text-text-muted/50 normal-case">(이름·전략 자동 입력)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyAgentPreset(i)}
                  title={p.description}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text transition hover:bg-surface-hover"
                >
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* ── 📝 턴별 전략 (메인) ── */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-semibold text-text">📝 턴별 토론 전략</p>
            <p className="mt-0.5 text-xs text-text-muted">
              5턴 각각의 전략을 한국어로 작성하세요. 스탯보다 이 전략이 AI 행동에 더 큰 영향을 줍니다.
            </p>

            {/* 전략 프리셋 버튼 */}
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
                  onClick={() => { setTurnStrategies({ ...EMPTY_STRATEGIES }); setActivePreset(null); }}
                  className="rounded-lg px-3 py-1.5 text-xs text-text-muted transition hover:bg-surface-hover"
                >
                  초기화
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
                      placeholder={`이 턴의 전략을 한국어로 작성하세요...`}
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
                    } ${!selected && specialties.length >= 3 ? "opacity-40 cursor-not-allowed" : ""}`}
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

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "생성 중…" : "에이전트 배치"}
          </button>
        </form>
      </div>
    </div>
  );
}
