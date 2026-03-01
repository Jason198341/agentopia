"use client";

import { useAgentStore } from "@/stores/agentStore";
import {
  type Agent,
  type TurnStrategies,
  SPECIALTY_LABELS,
  type Specialty,
  getPersonality,
  getTurnStrategies,
  SPEAKING_STYLES,
  DEBATE_PHILOSOPHIES,
  STRATEGY_PATTERNS,
  TURN_LABELS,
} from "@/types/agent";
import { BADGE_MAP } from "@/types/badge";
import { getTierForElo, winRate as calcWinRate, calcStreak } from "@/lib/tiers";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CriteriaScores = {
  logic: number;
  rebuttal: number;
  consistency: number;
  persuasion: number;
  expression: number;
  factual: number;
};

type BattleHistoryItem = {
  id: string;
  opponent: string;
  topic: string;
  category: string;
  result: "win" | "loss" | "draw";
  myScore: number;
  theirScore: number;
  eloChange: number;
  date: string | null;
  criteria: CriteriaScores | null;
};

type EloPoint = {
  elo: number;
  change: number;
  date: string;
};

export function AgentDetail({
  agent,
  isOwner,
  battleHistory,
  eloHistory,
}: {
  agent: Agent;
  isOwner: boolean;
  battleHistory: BattleHistoryItem[];
  eloHistory: EloPoint[];
}) {
  const router = useRouter();
  const { deleteAgent } = useAgentStore();
  const [deleting, setDeleting] = useState(false);
  const tier = getTierForElo(agent.elo);
  const winRate = calcWinRate(agent.wins, agent.losses);

  // Calculate streak from battle history (already sorted newest first)
  const streakResults = battleHistory.map((b) => b.result);
  const streak = calcStreak(streakResults);

  async function handleDelete() {
    if (!confirm("이 에이전트를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    await deleteAgent(agent.id);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; 대시보드
        </a>

        {/* Header */}
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">{agent.name}</h1>
            <p className="text-sm text-text-muted">v{agent.version}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{agent.elo}</p>
            <p className={`text-sm font-medium ${tier.color}`}>{tier.emoji} {tier.ko}</p>
          </div>
        </div>

        {/* Record */}
        <div className="mt-6 grid grid-cols-4 gap-3">
          <StatCard label="승" value={String(agent.wins)} color="text-success" />
          <StatCard label="패" value={String(agent.losses)} color="text-danger" />
          <StatCard label="승률" value={`${winRate}%`} color="text-accent" />
          <StatCard
            label={streak.type === "win" ? "연승" : streak.type === "loss" ? "연패" : "연속"}
            value={streak.count >= 2 ? `${streak.type === "win" ? "🔥" : "❄️"}${streak.count}` : "—"}
            color={streak.type === "win" ? "text-success" : streak.type === "loss" ? "text-danger" : "text-text-muted"}
          />
        </div>

        {/* ELO Trend Graph */}
        {eloHistory.length >= 2 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              ELO 추이
            </h2>
            <EloChart points={eloHistory} />
          </section>
        )}

        {/* Per-Criteria Score Trends */}
        {battleHistory.filter((b) => b.criteria).length >= 2 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              항목별 점수 추이
            </h2>
            <CriteriaTrends battles={battleHistory.filter((b) => b.criteria).reverse()} />
          </section>
        )}

        {/* Turn-by-Turn Strategy (primary) */}
        {(() => {
          const strategies = getTurnStrategies(agent);
          return strategies ? (
            <section className="mt-6">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
                  📝 턴별 전략
                </h2>
                <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">AI 핵심 행동 지침</span>
              </div>
              <div className="mt-3 space-y-2">
                {(Object.keys(TURN_LABELS) as (keyof TurnStrategies)[]).map((key) => {
                  const label = TURN_LABELS[key];
                  const text = strategies[key];
                  if (!text || !text.trim()) return null;
                  return (
                    <div key={key} className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
                      <span className="text-xs font-semibold text-accent">{label.ko}</span>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{text}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null;
        })()}

        {/* Debate Approach (personality presets) */}
        {(() => {
          const p = getPersonality(agent);
          const style = p.speaking_style ? SPEAKING_STYLES.find((s) => s.id === p.speaking_style) : null;
          const phil = p.debate_philosophy ? DEBATE_PHILOSOPHIES.find((d) => d.id === p.debate_philosophy) : null;
          const strat = p.strategy ? STRATEGY_PATTERNS.find((s) => s.id === p.strategy) : null;
          const hasAny = style || phil || strat || p.custom_instructions;
          return hasAny ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
                토론 방식
              </h2>
              <div className="mt-3 space-y-2">
                {style && (
                  <div className="rounded-lg bg-surface/50 px-3 py-2">
                    <span className="text-xs font-semibold text-accent">{style.emoji} {style.ko}</span>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{style.prompt}</p>
                  </div>
                )}
                {phil && (
                  <div className="rounded-lg bg-surface/50 px-3 py-2">
                    <span className="text-xs font-semibold text-accent">{phil.emoji} {phil.ko}</span>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{phil.prompt}</p>
                  </div>
                )}
                {strat && (
                  <div className="rounded-lg bg-surface/50 px-3 py-2">
                    <span className="text-xs font-semibold text-accent">{strat.emoji} {strat.ko}</span>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{strat.prompt}</p>
                  </div>
                )}
                {p.custom_instructions && (
                  <div className="rounded-lg bg-surface/50 px-3 py-2">
                    <span className="text-xs font-semibold text-accent">커스텀 지시사항</span>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{p.custom_instructions}</p>
                  </div>
                )}
              </div>
            </section>
          ) : null;
        })()}

        {/* Badges */}
        {(() => {
          const badges: string[] = (agent.traits._badges as unknown as string[]) ?? [];
          return badges.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
                배지
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {badges.map((badgeId) => {
                  const badge = BADGE_MAP[badgeId];
                  if (!badge) return null;
                  return (
                    <span
                      key={badgeId}
                      className="rounded-full bg-warning/10 px-3 py-1 text-sm text-warning"
                      title={badge.description}
                    >
                      {badge.emoji} {badge.name}
                    </span>
                  );
                })}
              </div>
            </section>
          ) : null;
        })()}

        {/* Specialties */}
        {agent.specialties.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              전문 분야
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.specialties.map((s) => {
                const label = SPECIALTY_LABELS[s as Specialty];
                return (
                  <span
                    key={s}
                    className="rounded-full bg-primary-dim px-3 py-1 text-sm text-primary"
                  >
                    {label?.emoji} {label?.ko ?? s}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* Evolved Traits (auto-earned from battles) */}
        {(() => {
          const traitEntries = Object.entries(agent.traits).filter(
            ([key]) => !key.startsWith("_"),
          );
          const TRAIT_META: Record<string, { emoji: string; desc: string }> = {
            Confidence: { emoji: "💪", desc: "5연승 달성" },
            Caution: { emoji: "🛡️", desc: "3연패 경험" },
            Grit: { emoji: "🦾", desc: "역전승 달성" },
            "Giant Slayer": { emoji: "⚔️", desc: "강적 격파" },
            Experienced: { emoji: "🎖️", desc: "10전 이상 참가" },
          };
          return traitEntries.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
                진화 특성
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {traitEntries.map(([trait, value]) => {
                  const meta = TRAIT_META[trait];
                  return (
                    <span
                      key={trait}
                      className={`rounded-full px-3 py-1 text-sm ${
                        Number(value) > 0
                          ? "bg-accent/15 text-accent"
                          : "bg-danger/15 text-danger"
                      }`}
                      title={meta?.desc ?? ""}
                    >
                      {meta?.emoji ?? "✨"} {trait}
                    </span>
                  );
                })}
              </div>
            </section>
          ) : null;
        })()}

        {/* Battle History */}
        {battleHistory.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              최근 배틀
            </h2>
            <div className="mt-3 space-y-2">
              {battleHistory.map((b) => (
                <a
                  key={b.id}
                  href={`/battle/${b.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:bg-surface-hover"
                >
                  <span
                    className={`w-8 text-center text-xs font-bold uppercase ${
                      b.result === "win"
                        ? "text-success"
                        : b.result === "loss"
                          ? "text-danger"
                          : "text-text-muted"
                    }`}
                  >
                    {b.result === "win" ? "W" : b.result === "loss" ? "L" : "D"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      vs {b.opponent}
                    </p>
                    <p className="truncate text-xs text-text-muted">{b.topic}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-text">
                      {b.myScore}–{b.theirScore}
                    </p>
                    <p
                      className={`text-xs font-mono font-bold ${
                        b.eloChange > 0
                          ? "text-success"
                          : b.eloChange < 0
                            ? "text-danger"
                            : "text-text-muted"
                      }`}
                    >
                      {b.eloChange > 0 ? `+${b.eloChange}` : b.eloChange}
                    </p>
                  </div>
                </a>
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
              에이전트 수정
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-danger/30 px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
            >
              {deleting ? "삭제 중…" : "삭제"}
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

/* ─── ELO Trend Chart (pure SVG) ─── */
function EloChart({ points }: { points: EloPoint[] }) {
  const W = 360;
  const H = 120;
  const PX = 32; // padding x
  const PY = 16; // padding y

  const elos = points.map((p) => p.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const range = maxElo - minElo || 1;

  // Map data to SVG coordinates
  const coords = points.map((p, i) => {
    const x = PX + (i / (points.length - 1)) * (W - PX * 2);
    const y = PY + (1 - (p.elo - minElo) / range) * (H - PY * 2);
    return { x, y, elo: p.elo, change: p.change };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

  // Gradient: green if net positive, red if net negative
  const netChange = points[points.length - 1].elo - points[0].elo;
  const strokeColor = netChange >= 0 ? "var(--success)" : "var(--danger)";

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }} aria-hidden="true">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PY + frac * (H - PY * 2);
          return (
            <line
              key={frac}
              x1={PX}
              y1={y}
              x2={W - PX}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
          );
        })}
        {/* ELO line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={3}
            fill={c.change >= 0 ? "var(--success)" : "var(--danger)"}
            stroke="var(--surface)"
            strokeWidth={1.5}
          />
        ))}
        {/* Min/Max labels */}
        <text x={PX - 4} y={PY + 4} textAnchor="end" className="fill-text-muted" fontSize={9}>
          {maxElo}
        </text>
        <text x={PX - 4} y={H - PY + 4} textAnchor="end" className="fill-text-muted" fontSize={9}>
          {minElo}
        </text>
      </svg>
      {/* Summary */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-text-muted">{points.length}전 기록</span>
        <span className={`font-mono font-bold ${netChange >= 0 ? "text-success" : "text-danger"}`}>
          {netChange >= 0 ? "+" : ""}{netChange} ELO
        </span>
      </div>
    </div>
  );
}

/* ─── Per-Criteria Score Trends ─── */
const CRITERIA_KEYS = ["logic", "rebuttal", "consistency", "persuasion", "expression", "factual"] as const;
const CRITERIA_KO: Record<string, string> = {
  logic: "논증력",
  rebuttal: "반박력",
  consistency: "일관성",
  persuasion: "설득력",
  expression: "표현력",
  factual: "정확성",
};
const CRITERIA_COLORS: Record<string, string> = {
  logic: "var(--primary)",
  rebuttal: "var(--danger)",
  consistency: "var(--accent)",
  persuasion: "var(--warning)",
  expression: "var(--success)",
  factual: "#a78bfa",
};

function CriteriaTrends({ battles }: { battles: BattleHistoryItem[] }) {
  // battles are in chronological order (oldest first)
  const count = battles.length;

  // Calculate averages for the latest vs first half
  const halfIdx = Math.floor(count / 2);
  const firstHalf = battles.slice(0, halfIdx);
  const secondHalf = battles.slice(halfIdx);

  function avg(items: BattleHistoryItem[], key: keyof CriteriaScores): number {
    const valid = items.filter((b) => b.criteria);
    if (valid.length === 0) return 0;
    return valid.reduce((sum, b) => sum + (b.criteria?.[key] ?? 0), 0) / valid.length;
  }

  return (
    <div className="mt-3 space-y-2">
      {CRITERIA_KEYS.map((key) => {
        const latestScore = battles[count - 1]?.criteria?.[key] ?? 0;
        const avgFirst = avg(firstHalf, key);
        const avgSecond = avg(secondHalf, key);
        const trend = avgSecond - avgFirst;

        return (
          <div
            key={key}
            className="flex items-center gap-3 rounded-lg bg-surface/50 px-3 py-2"
          >
            <span className="w-16 text-xs font-medium text-text-muted">
              {CRITERIA_KO[key]}
            </span>
            {/* Mini sparkline for this criteria */}
            <MiniSparkline
              values={battles.map((b) => b.criteria?.[key] ?? 0)}
              color={CRITERIA_COLORS[key]}
              max={20}
            />
            <span className="w-8 text-right font-mono text-xs font-bold text-text">
              {latestScore}
            </span>
            <span
              className={`w-10 text-right font-mono text-[10px] font-bold ${
                trend > 0.5 ? "text-success" : trend < -0.5 ? "text-danger" : "text-text-muted"
              }`}
            >
              {trend > 0 ? `+${trend.toFixed(1)}` : trend.toFixed(1)}
            </span>
          </div>
        );
      })}
      <p className="text-right text-[10px] text-text-muted">
        최근 {count}전 기준 · 추이는 전반/후반 평균 비교
      </p>
    </div>
  );
}

function MiniSparkline({
  values,
  color,
  max,
}: {
  values: number[];
  color: string;
  max: number;
}) {
  const W = 80;
  const H = 20;
  if (values.length < 2) return <div style={{ width: W, height: H }} />;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  });

  return (
    <svg width={W} height={H} className="shrink-0" aria-hidden="true">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
