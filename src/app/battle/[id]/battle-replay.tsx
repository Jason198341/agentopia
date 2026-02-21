"use client";

import type { Agent, AgentStats, TurnStrategies } from "@/types/agent";
import { STAT_LABELS, getTurnStrategies, TURN_LABELS as STRATEGY_TURN_LABELS } from "@/types/agent";
import type { Battle, BattleTurn, BattleScore } from "@/types/battle";
import { TURN_SEQUENCE } from "@/types/battle";
import { DEBATE_TOPICS, type TopicDifficulty } from "@/data/topics";
import { getTierForElo } from "@/lib/tiers";
import { useState, useEffect, useCallback } from "react";

interface Props {
  battle: Battle;
  turns: BattleTurn[];
  agentA: Agent; // PRO
  agentB: Agent; // CON
  userId: string;
}

// Live replay step mapping:
// Step 0: nothing (initial)
// Steps 1-4: Turn 1 (1=thinking-pro, 2=pro-revealed, 3=thinking-con, 4=con-revealed)
// Steps 5-8: Turn 2 ... Steps 17-20: Turn 5
// Step 21: scores revealed
const TOTAL_STEPS = 21;
function turnForStep(step: number) { return Math.ceil(step / 4); }
function phaseForStep(step: number): "thinking-pro" | "pro" | "thinking-con" | "con" | "scores" {
  if (step >= TOTAL_STEPS) return "scores";
  const mod = ((step - 1) % 4) + 1;
  if (mod === 1) return "thinking-pro";
  if (mod === 2) return "pro";
  if (mod === 3) return "thinking-con";
  return "con";
}

const TURN_LABELS: Record<string, string> = {
  opening: "오프닝",
  rebuttal: "반박",
  counter: "재반박",
  free: "자유 토론",
  closing: "마무리 발언",
};

export function BattleReplay({ battle, turns, agentA, agentB, userId }: Props) {
  // Group turns by turn_number: each turn has 1 PRO + 1 CON message
  const turnPairs = TURN_SEQUENCE.map((seq) => {
    const pro = turns.find((t) => t.turn_number === seq.turn && t.role === "pro");
    const con = turns.find((t) => t.turn_number === seq.turn && t.role === "con");
    return { turnNumber: seq.turn, type: seq.type, pro, con };
  });

  // Live replay state
  const [step, setStep] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const showScores = step >= TOTAL_STEPS;
  const currentPhase = phaseForStep(step);
  const currentTurn = turnForStep(step);

  // Auto-advance in live mode
  useEffect(() => {
    if (!isLive || step >= TOTAL_STEPS) return;
    if (step === 0) {
      // Start immediately
      const t = setTimeout(() => setStep(1), 300);
      return () => clearTimeout(t);
    }
    const phase = phaseForStep(step);
    const delay = phase === "thinking-pro" || phase === "thinking-con" ? 1500 : 1000;
    const t = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [isLive, step]);

  // Skip to end
  const skipToEnd = useCallback(() => {
    setIsLive(false);
    setStep(TOTAL_STEPS);
  }, []);

  // Manual next (when not in live mode)
  function handleNext() {
    if (step < TOTAL_STEPS) {
      // Jump to next turn's con-revealed (skip thinking animations)
      const nextTurnEnd = Math.min(Math.ceil(step / 4) * 4 + 4, TOTAL_STEPS);
      setStep(nextTurnEnd);
    }
  }

  const isAborted = battle.status === "aborted";
  const userOwnsA = agentA.owner_id === userId;
  const userOwnsB = agentB.owner_id === userId;
  const userAgent = userOwnsA ? agentA : userOwnsB ? agentB : null;

  // Infer difficulty from topic lookup
  const topicEntry = DEBATE_TOPICS.find((t) => t.topic === battle.topic);
  const difficulty: TopicDifficulty = topicEntry?.difficulty ?? "standard";

  return (
    <div>
      {/* Header */}
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
        &larr; 대시보드
      </a>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs uppercase tracking-wider text-text-muted">
            {battle.topic_category}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              difficulty === "casual"
                ? "bg-success/15 text-success"
                : difficulty === "advanced"
                  ? "bg-danger/15 text-danger"
                  : "bg-warning/15 text-warning"
            }`}
          >
            {difficulty === "casual" ? "캐주얼" : difficulty === "advanced" ? "고급" : "표준"}
          </span>
        </div>
        <h1 className="mt-1 text-center text-lg font-bold text-text">
          &ldquo;{battle.topic}&rdquo;
        </h1>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-center">
            <p className="text-sm font-medium text-success">찬성</p>
            <p className="font-bold text-text">{agentA.name}</p>
            <p className="text-xs text-text-muted">
              ELO {agentA.elo}
              <span className={`ml-1 ${getTierForElo(agentA.elo).color}`}>
                {getTierForElo(agentA.elo).emoji}
              </span>
            </p>
          </div>
          <p className="text-2xl font-bold text-text-muted">VS</p>
          <div className="text-center">
            <p className="text-sm font-medium text-danger">반대</p>
            <p className="font-bold text-text">{agentB.name}</p>
            <p className="text-xs text-text-muted">
              ELO {agentB.elo}
              <span className={`ml-1 ${getTierForElo(agentB.elo).color}`}>
                {getTierForElo(agentB.elo).emoji}
              </span>
            </p>
          </div>
        </div>
      </div>

      {isAborted && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-center text-sm text-danger">
          이 배틀은 오류로 인해 중단되었습니다.
        </div>
      )}

      {/* Turns */}
      <div className="mt-6 space-y-4">
        {turnPairs.map((pair) => {
          const turnStart = (pair.turnNumber - 1) * 4 + 1;
          if (step < turnStart) return null;

          const proVisible = step >= turnStart + 1;
          const proThinking = step === turnStart && isLive;
          const conVisible = step >= turnStart + 3;
          const conThinking = step === turnStart + 2 && isLive;

          return (
            <div key={pair.turnNumber} className="space-y-2 anim-fade-in">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                {pair.turnNumber}턴 &mdash; {TURN_LABELS[pair.type]}
              </p>

              {/* PRO thinking */}
              {proThinking && (
                <ThinkingBubble name={agentA.name} side="pro" />
              )}

              {/* PRO message */}
              {proVisible && pair.pro && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 anim-slide-left">
                  <p className="mb-1 text-xs font-medium text-success">
                    {agentA.name} (찬성)
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text">
                    {pair.pro.content}
                  </p>
                </div>
              )}

              {/* CON thinking */}
              {conThinking && (
                <ThinkingBubble name={agentB.name} side="con" />
              )}

              {/* CON message */}
              {conVisible && pair.con && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 anim-slide-right">
                  <p className="mb-1 text-xs font-medium text-danger">
                    {agentB.name} (반대)
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text">
                    {pair.con.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live controls */}
      {!showScores && !isAborted && (
        <div className="mt-6 flex gap-3">
          {isLive ? (
            <>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-dim py-3 text-sm text-primary">
                <LiveDot />
                <span className="font-medium">라이브 관전 중... ({currentTurn}/5턴)</span>
              </div>
              <button
                onClick={skipToEnd}
                className="rounded-xl border border-border px-4 py-3 text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
              >
                건너뛰기
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="w-full rounded-xl border border-primary/30 bg-primary-dim py-3 font-medium text-primary transition hover:bg-primary/20"
            >
              다음 턴 ({Math.min(Math.ceil(step / 4) + 1, 5)}/5)
            </button>
          )}
        </div>
      )}

      {/* Scores */}
      {showScores && battle.score_a && battle.score_b && (
        <div className="mt-6">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-text-muted">
            심판 판정
          </h2>

          <ScoreComparison
            scoreA={battle.score_a}
            scoreB={battle.score_b}
            nameA={agentA.name}
            nameB={agentB.name}
          />

          {/* Winner */}
          <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-center">
            {battle.winner_id ? (
              <>
                <p className="text-2xl font-bold text-warning">
                  {battle.winner_id === agentA.id ? agentA.name : agentB.name} 승리!
                </p>
                <div className="mt-2 flex justify-center gap-6 text-sm">
                  <span className={battle.elo_change_a > 0 ? "text-success" : "text-danger"}>
                    {agentA.name}: {battle.elo_change_a > 0 ? "+" : ""}
                    {battle.elo_change_a} ELO
                  </span>
                  <span className={battle.elo_change_b > 0 ? "text-success" : "text-danger"}>
                    {agentB.name}: {battle.elo_change_b > 0 ? "+" : ""}
                    {battle.elo_change_b} ELO
                  </span>
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-warning">무승부!</p>
            )}
          </div>

          {/* Share Card */}
          <ShareCard
            battle={battle}
            agentA={agentA}
            agentB={agentB}
            difficulty={difficulty}
          />

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {userAgent && (
              <a
                href="/battle"
                className="flex-1 rounded-xl bg-primary py-3 text-center font-medium text-white transition hover:bg-primary-hover"
              >
                재대결
              </a>
            )}
            <a
              href="/dashboard"
              className="flex-1 rounded-xl border border-border py-3 text-center font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              대시보드
            </a>
          </div>

          {/* Strategy Reveal — Black Box opened after battle */}
          <StrategyReveal agentA={agentA} agentB={agentB} userId={userId} />

          {/* Post-Battle Analysis Report */}
          {userAgent && (
            <BattleAnalysis
              battle={battle}
              turnPairs={turnPairs}
              agentA={agentA}
              agentB={agentB}
              userAgent={userAgent}
              isUserA={userOwnsA}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Post-Battle Analysis Report ───

// Map judge criteria to agent stats that could improve them
const CRITERIA_STAT_MAP: Record<string, { stats: (keyof AgentStats)[]; tip: string }> = {
  logic: {
    stats: ["logic", "knowledge"],
    tip: "논리와 지식 스탯을 올리면 논증 구조가 탄탄해집니다.",
  },
  rebuttal: {
    stats: ["aggression", "logic", "adaptability"],
    tip: "공격(약점 공략), 논리(정밀 반격), 적응(동적 대응)이 반박력을 높입니다.",
  },
  consistency: {
    stats: ["logic", "knowledge"],
    tip: "논리(구조적 사고)와 지식(사실 근거)을 높이면 일관성이 강화됩니다.",
  },
  persuasion: {
    stats: ["boldness", "creativity", "humor"],
    tip: "대담(강한 입장), 창의(새로운 관점), 유머(청중 몰입)가 설득력을 만듭니다.",
  },
  expression: {
    stats: ["brevity", "humor", "creativity"],
    tip: "간결(핵심 전달), 유머(매력적 톤), 창의(생생한 표현)가 표현력을 높입니다.",
  },
  factual: {
    stats: ["knowledge", "logic"],
    tip: "지식(전문성과 정밀도)과 논리(근거 기반 추론)가 사실 정확성의 핵심입니다.",
  },
};

function BattleAnalysis({
  battle,
  turnPairs,
  agentA,
  agentB,
  userAgent,
  isUserA,
}: {
  battle: Battle;
  turnPairs: { turnNumber: number; type: string; pro?: BattleTurn; con?: BattleTurn }[];
  agentA: Agent;
  agentB: Agent;
  userAgent: Agent;
  isUserA: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const myScore = isUserA ? battle.score_a : battle.score_b;
  const theirScore = isUserA ? battle.score_b : battle.score_a;
  const won = battle.winner_id === userAgent.id;
  const draw = battle.winner_id === null;

  if (!myScore || !theirScore) return null;

  // Find weakest criteria (biggest gap where user lost)
  const criteriaGaps = CRITERIA.map(({ key }) => ({
    key,
    myVal: myScore[key] ?? 0,
    theirVal: theirScore[key] ?? 0,
    gap: (theirScore[key] ?? 0) - (myScore[key] ?? 0),
  }));
  const sortedWeaknesses = [...criteriaGaps].sort((a, b) => b.gap - a.gap);
  const worstCriteria = sortedWeaknesses[0];

  // Find branching point — turn where user's argument was weakest (heuristic: shortest response in losing battle)
  const myTurns = turnPairs.map((p) => {
    const myMsg = isUserA ? p.pro : p.con;
    const theirMsg = isUserA ? p.con : p.pro;
    return {
      turn: p.turnNumber,
      type: p.type,
      myLength: myMsg?.content.length ?? 0,
      theirLength: theirMsg?.content.length ?? 0,
      ratio: (myMsg?.content.length ?? 0) / Math.max(theirMsg?.content.length ?? 1, 1),
    };
  });
  // Branching point: turn with worst length ratio (simplified heuristic for "where you fell behind")
  const branchingTurn = [...myTurns].sort((a, b) => a.ratio - b.ratio)[0];

  // Stat recommendations based on weak criteria
  const recommendations: { stat: keyof AgentStats; reason: string }[] = [];
  const seenStats = new Set<string>();
  for (const weakness of sortedWeaknesses.filter((w) => w.gap > 0)) {
    const mapping = CRITERIA_STAT_MAP[weakness.key];
    if (!mapping) continue;
    for (const stat of mapping.stats) {
      if (!seenStats.has(stat) && userAgent.stats[stat] < 7) {
        seenStats.add(stat);
        recommendations.push({
          stat,
          reason: `${CRITERIA.find((c) => c.key === weakness.key)?.label ?? weakness.key}: ${mapping.tip}`,
        });
      }
    }
    if (recommendations.length >= 3) break;
  }

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-left transition hover:bg-accent/10"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-accent">
            배틀 분석 리포트
          </span>
          <span className="text-xs text-text-muted">{expanded ? "▲" : "▼"}</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {won ? "잘한 점과 우위를 유지하는 방법을 확인하세요." : draw ? "교착 상태를 분석하고 돌파구를 찾아보세요." : "무엇이 잘못됐는지 파악하고 개선점을 확인하세요."}
        </p>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Radar Chart */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              점수 레이더
            </h3>
            <div className="mt-3 flex justify-center">
              <RadarChart myScore={myScore} theirScore={theirScore} />
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                {userAgent.name}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-danger" />
                상대
              </span>
            </div>
          </div>

          {/* Branching Point */}
          {!won && branchingTurn && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-warning">
                전환점 — {branchingTurn.turn}턴
              </h3>
              <p className="mt-2 text-sm text-text">
                <strong>{TURN_LABELS[branchingTurn.type]}</strong> 단계에서 승부가 갈린 것으로 보입니다. 당신의 에이전트 응답이 상대에 비해{" "}
                {branchingTurn.ratio < 0.7 ? "현저히 짧아" : "다소 빈약해"} 더 강한 논증을 펼칠 기회를 놓친 것 같습니다.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                아깝다! 이 턴에서 조금만 더 강했으면 결과가 뒤집힐 수 있었습니다.
              </p>
            </div>
          )}

          {/* Weakest Criteria */}
          {worstCriteria.gap > 0 && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-danger">
                최대 격차: {CRITERIA.find((c) => c.key === worstCriteria.key)?.label}
              </h3>
              <p className="mt-2 text-sm text-text">
                내 점수 <strong>{worstCriteria.myVal}</strong> vs 상대{" "}
                <strong>{worstCriteria.theirVal}</strong> ({worstCriteria.gap}점 차이).
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {CRITERIA_STAT_MAP[worstCriteria.key]?.tip}
              </p>
            </div>
          )}

          {/* Stat Recommendations */}
          {recommendations.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-primary">
                {won ? "우위 유지하기" : "추천 스탯 업그레이드"}
              </h3>
              <div className="mt-3 space-y-2">
                {recommendations.map(({ stat, reason }) => {
                  const label = STAT_LABELS[stat];
                  return (
                    <div key={stat} className="flex items-start gap-2">
                      <span className="text-lg">{label.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-text">
                          {label.ko}: {userAgent.stats[stat]} → {Math.min(userAgent.stats[stat] + 2, 10)}
                        </p>
                        <p className="text-xs text-text-muted">{reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a
                href={`/agents/${userAgent.id}/edit`}
                className="mt-3 inline-block rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white transition hover:bg-primary-hover"
              >
                스탯 수정하기
              </a>
            </div>
          )}

          {/* Per-Turn Summary */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              턴별 평가
            </h3>
            <div className="mt-3 space-y-2">
              {turnPairs.map((pair) => {
                const myMsg = isUserA ? pair.pro : pair.con;
                const theirMsg = isUserA ? pair.con : pair.pro;
                const myLen = myMsg?.content.length ?? 0;
                const theirLen = theirMsg?.content.length ?? 0;
                const turnWinner = myLen > theirLen * 1.2 ? "you" : theirLen > myLen * 1.2 ? "opponent" : "even";
                return (
                  <div key={pair.turnNumber} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-xs text-text-muted">
                      T{pair.turnNumber} {TURN_LABELS[pair.type]?.slice(0, 8)}
                    </span>
                    <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="bg-primary"
                        style={{ width: `${(myLen / Math.max(myLen + theirLen, 1)) * 100}%` }}
                      />
                      <div
                        className="bg-danger"
                        style={{ width: `${(theirLen / Math.max(myLen + theirLen, 1)) * 100}%` }}
                      />
                    </div>
                    <span
                      className={`w-6 text-center text-xs font-bold ${
                        turnWinner === "you" ? "text-success" : turnWinner === "opponent" ? "text-danger" : "text-text-muted"
                      }`}
                    >
                      {turnWinner === "you" ? "+" : turnWinner === "opponent" ? "-" : "="}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SVG Radar Chart ───

function RadarChart({ myScore, theirScore }: { myScore: BattleScore; theirScore: BattleScore }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const labels = CRITERIA;

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function scoreToPoints(score: BattleScore) {
    return labels
      .map(({ key }, i) => {
        const angle = (360 / labels.length) * i;
        const r = ((score[key] ?? 0) / 20) * maxR;
        return polarToXY(angle, r);
      })
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  }

  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={labels
            .map((_, i) => {
              const angle = (360 / labels.length) * i;
              const p = polarToXY(angle, maxR * level);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="0.5"
        />
      ))}

      {/* Axes */}
      {labels.map((_, i) => {
        const angle = (360 / labels.length) * i;
        const p = polarToXY(angle, maxR);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth="0.5" />;
      })}

      {/* Opponent score polygon */}
      <polygon points={scoreToPoints(theirScore)} fill="rgba(239,68,68,0.15)" stroke="var(--color-danger)" strokeWidth="1.5" />

      {/* My score polygon */}
      <polygon points={scoreToPoints(myScore)} fill="rgba(139,92,246,0.2)" stroke="var(--color-primary)" strokeWidth="2" />

      {/* Labels */}
      {labels.map(({ label }, i) => {
        const angle = (360 / labels.length) * i;
        const p = polarToXY(angle, maxR + 14);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="var(--color-text-muted)"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Score Comparison Bars ───

const CRITERIA = [
  { key: "logic" as const, label: "논증력" },
  { key: "rebuttal" as const, label: "반박력" },
  { key: "consistency" as const, label: "일관성" },
  { key: "persuasion" as const, label: "설득력" },
  { key: "expression" as const, label: "표현력" },
  { key: "factual" as const, label: "사실 정확성" },
];

function ScoreComparison({
  scoreA,
  scoreB,
  nameA,
  nameB,
}: {
  scoreA: BattleScore;
  scoreB: BattleScore;
  nameA: string;
  nameB: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="text-success">{nameA} (찬성)</span>
        <span className="text-danger">{nameB} (반대)</span>
      </div>

      {CRITERIA.map(({ key, label }) => {
        const a = scoreA[key] ?? 0;
        const b = scoreB[key] ?? 0;
        if (a === 0 && b === 0) return null; // skip criteria missing from old battles
        return (
          <div key={key}>
            <p className="mb-1 text-center text-xs text-text-muted">{label}</p>
            <div className="flex items-center gap-2">
              <span className="w-8 text-right font-mono text-sm font-bold text-success">
                {a}
              </span>
              <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className="bg-success transition-all"
                  style={{ width: `${(a / (a + b || 1)) * 100}%` }}
                />
                <div
                  className="bg-danger transition-all"
                  style={{ width: `${(b / (a + b || 1)) * 100}%` }}
                />
              </div>
              <span className="w-8 font-mono text-sm font-bold text-danger">
                {b}
              </span>
            </div>
          </div>
        );
      })}

      {/* Totals */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xl font-bold text-success">{scoreA.total}</span>
        <span className="text-sm font-medium text-text-muted">합계</span>
        <span className="text-xl font-bold text-danger">{scoreB.total}</span>
      </div>
    </div>
  );
}

// ─── Share Card ───

function ShareCard({
  battle,
  agentA,
  agentB,
  difficulty,
}: {
  battle: Battle;
  agentA: Agent;
  agentB: Agent;
  difficulty: TopicDifficulty;
}) {
  const [copied, setCopied] = useState(false);

  const winnerName = battle.winner_id
    ? battle.winner_id === agentA.id ? agentA.name : agentB.name
    : null;
  const scoreA = battle.score_a?.total ?? 0;
  const scoreB = battle.score_b?.total ?? 0;

  const shareText = [
    `${agentA.name} vs ${agentB.name}`,
    `주제: "${battle.topic}" [${difficulty}]`,
    `점수: ${scoreA}–${scoreB}`,
    winnerName ? `승자: ${winnerName}` : "무승부!",
    `ELO: ${agentA.name} ${battle.elo_change_a > 0 ? "+" : ""}${battle.elo_change_a} | ${agentB.name} ${battle.elo_change_b > 0 ? "+" : ""}${battle.elo_change_b}`,
    "",
    `리플레이 보기: ${typeof window !== "undefined" ? window.location.href : ""}`,
    "",
    "Agentopia — AI 토론 아레나",
    "agentopia.online",
  ].join("\n");

  async function handleShare() {
    // Try Web Share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${agentA.name} vs ${agentB.name} — Agentopia 배틀`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Final fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="mt-6">
      {/* Visual card preview */}
      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0a0e1a] to-[#1a1040] p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-primary/60">
            Agentopia
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              difficulty === "casual"
                ? "bg-success/15 text-success"
                : difficulty === "advanced"
                  ? "bg-danger/15 text-danger"
                  : "bg-warning/15 text-warning"
            }`}
          >
            {difficulty === "casual" ? "캐주얼" : difficulty === "advanced" ? "고급" : "표준"}
          </span>
        </div>
        <p className="mt-2 text-center text-xs text-text-muted">
          {battle.topic_category}
        </p>
        <p className="mt-1 text-center text-sm font-medium text-text">
          &ldquo;{battle.topic}&rdquo;
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-success">찬성</p>
            <p className="text-sm font-bold text-text">{agentA.name}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-text">
              {scoreA}<span className="text-text-muted">–</span>{scoreB}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-danger">반대</p>
            <p className="text-sm font-bold text-text">{agentB.name}</p>
          </div>
        </div>
        {winnerName && (
          <p className="mt-3 text-center text-sm font-bold text-warning">
            {winnerName} 승리!
          </p>
        )}
        <p className="mt-2 text-center text-[10px] text-text-muted/50">
          agentopia.online
        </p>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="mt-3 w-full rounded-xl border border-accent/30 bg-accent/5 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/10"
      >
        {copied ? "클립보드에 복사됨!" : "배틀 결과 공유"}
      </button>
    </div>
  );
}

// ─── Live Replay Components ───

function ThinkingBubble({ name, side }: { name: string; side: "pro" | "con" }) {
  const borderColor = side === "pro" ? "border-success/20" : "border-danger/20";
  const bgColor = side === "pro" ? "bg-success/5" : "bg-danger/5";
  const textColor = side === "pro" ? "text-success" : "text-danger";
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 animate-pulse`}>
      <p className={`mb-1 text-xs font-medium ${textColor}`}>{name}</p>
      <div className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted/40" style={{ animationDelay: "0ms" }} />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted/40" style={{ animationDelay: "150ms" }} />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted/40" style={{ animationDelay: "300ms" }} />
        <span className="ml-2 text-xs text-text-muted">생각 중...</span>
      </div>
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
    </span>
  );
}

// ─── Strategy Black Box Reveal ───

const TURN_KEYS = ["turn_1", "turn_2", "turn_3", "turn_4", "turn_5"] as const;

function StrategyReveal({
  agentA,
  agentB,
  userId,
}: {
  agentA: Agent;
  agentB: Agent;
  userId: string;
}) {
  const [revealed, setRevealed] = useState(false);

  const strategiesA = getTurnStrategies(agentA);
  const strategiesB = getTurnStrategies(agentB);

  // Nothing to show if neither agent has strategies
  if (!strategiesA && !strategiesB) return null;

  // Determine which agent is "mine" vs "opponent"
  const userOwnsA = agentA.owner_id === userId;
  const userOwnsB = agentB.owner_id === userId;
  const myStrategies = userOwnsA ? strategiesA : userOwnsB ? strategiesB : null;
  const myName = userOwnsA ? agentA.name : userOwnsB ? agentB.name : null;
  const opponentStrategies = userOwnsA ? strategiesB : strategiesA;
  const opponentName = userOwnsA ? agentB.name : agentA.name;

  return (
    <div className="mt-6">
      <button
        onClick={() => setRevealed(!revealed)}
        className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition hover:bg-primary/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">
              전략 공개
            </span>
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              BLACK BOX
            </span>
          </div>
          <span className="text-xs text-text-muted">{revealed ? "▲" : "▼"}</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {revealed
            ? "양측의 턴별 전략을 확인하세요."
            : "배틀이 끝났습니다. 상대의 전략을 열어볼까요?"}
        </p>
      </button>

      {revealed && (
        <div className="mt-3 space-y-4">
          {/* My strategy (if exists) */}
          {myStrategies && myName && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-success">
                내 전략 — {myName}
              </p>
              <div className="mt-2 space-y-1.5">
                {TURN_KEYS.map((key) => {
                  const text = myStrategies[key];
                  if (!text || !text.trim()) return null;
                  return (
                    <div key={key} className="rounded-lg bg-surface/50 px-3 py-1.5">
                      <span className="text-[10px] font-bold text-success">
                        {STRATEGY_TURN_LABELS[key].ko}
                      </span>
                      <p className="text-xs text-text-muted">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opponent strategy (the reveal!) */}
          {opponentStrategies && (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-danger">
                상대 전략 — {opponentName}
              </p>
              <div className="mt-2 space-y-1.5">
                {TURN_KEYS.map((key) => {
                  const text = opponentStrategies[key];
                  if (!text || !text.trim()) return null;
                  return (
                    <div key={key} className="rounded-lg bg-surface/50 px-3 py-1.5">
                      <span className="text-[10px] font-bold text-danger">
                        {STRATEGY_TURN_LABELS[key].ko}
                      </span>
                      <p className="text-xs text-text-muted">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No strategies case */}
          {!myStrategies && !opponentStrategies && (
            <p className="text-center text-sm text-text-muted">
              이 배틀에는 턴별 전략이 설정되지 않았습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
