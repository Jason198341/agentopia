"use client";

import type { Agent, AgentStats } from "@/types/agent";
import { STAT_LABELS } from "@/types/agent";
import type { Battle, BattleTurn, BattleScore } from "@/types/battle";
import { TURN_SEQUENCE } from "@/types/battle";
import { DEBATE_TOPICS, type TopicDifficulty } from "@/data/topics";
import { useState } from "react";

interface Props {
  battle: Battle;
  turns: BattleTurn[];
  agentA: Agent; // PRO
  agentB: Agent; // CON
  userId: string;
}

const TURN_LABELS: Record<string, string> = {
  opening: "Opening Statement",
  rebuttal: "Rebuttal",
  counter: "Counter-Rebuttal",
  free: "Free Exchange",
  closing: "Closing Statement",
};

export function BattleReplay({ battle, turns, agentA, agentB, userId }: Props) {
  // Group turns by turn_number: each turn has 1 PRO + 1 CON message
  const turnPairs = TURN_SEQUENCE.map((seq) => {
    const pro = turns.find((t) => t.turn_number === seq.turn && t.role === "pro");
    const con = turns.find((t) => t.turn_number === seq.turn && t.role === "con");
    return { turnNumber: seq.turn, type: seq.type, pro, con };
  });

  const [revealedTurn, setRevealedTurn] = useState(1);
  const [showScores, setShowScores] = useState(false);
  const allRevealed = revealedTurn > 5;

  function handleNext() {
    if (revealedTurn <= 5) {
      setRevealedTurn((t) => t + 1);
    }
    if (revealedTurn === 5) {
      setShowScores(true);
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
        &larr; Dashboard
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
            {difficulty}
          </span>
        </div>
        <h1 className="mt-1 text-center text-lg font-bold text-text">
          &ldquo;{battle.topic}&rdquo;
        </h1>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-center">
            <p className="text-sm font-medium text-success">PRO</p>
            <p className="font-bold text-text">{agentA.name}</p>
            <p className="text-xs text-text-muted">ELO {agentA.elo}</p>
          </div>
          <p className="text-2xl font-bold text-text-muted">VS</p>
          <div className="text-center">
            <p className="text-sm font-medium text-danger">CON</p>
            <p className="font-bold text-text">{agentB.name}</p>
            <p className="text-xs text-text-muted">ELO {agentB.elo}</p>
          </div>
        </div>
      </div>

      {isAborted && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-center text-sm text-danger">
          This battle was aborted due to an error.
        </div>
      )}

      {/* Turns */}
      <div className="mt-6 space-y-4">
        {turnPairs.map((pair) => {
          if (pair.turnNumber > revealedTurn) return null;
          return (
            <div key={pair.turnNumber} className="space-y-2">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                Turn {pair.turnNumber} &mdash; {TURN_LABELS[pair.type]}
              </p>

              {/* PRO message */}
              {pair.pro && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <p className="mb-1 text-xs font-medium text-success">
                    {agentA.name} (PRO)
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text">
                    {pair.pro.content}
                  </p>
                </div>
              )}

              {/* CON message */}
              {pair.con && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
                  <p className="mb-1 text-xs font-medium text-danger">
                    {agentB.name} (CON)
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

      {/* Next Turn Button */}
      {!allRevealed && !isAborted && (
        <button
          onClick={handleNext}
          className="mt-6 w-full rounded-xl border border-primary/30 bg-primary-dim py-3 font-medium text-primary transition hover:bg-primary/20"
        >
          {revealedTurn <= 5
            ? `Next Turn (${revealedTurn}/${5})`
            : "Reveal Scores"}
        </button>
      )}

      {/* Scores */}
      {showScores && battle.score_a && battle.score_b && (
        <div className="mt-6">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-text-muted">
            Judge&apos;s Scores
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
                  {battle.winner_id === agentA.id ? agentA.name : agentB.name} Wins!
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
              <p className="text-2xl font-bold text-warning">Draw!</p>
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
                Rematch
              </a>
            )}
            <a
              href="/dashboard"
              className="flex-1 rounded-xl border border-border py-3 text-center font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
            >
              Dashboard
            </a>
          </div>

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
    tip: "Strengthen logical reasoning with higher Logic and Knowledge stats.",
  },
  rebuttal: {
    stats: ["aggression", "logic", "adaptability"],
    tip: "Better rebuttals need Aggression to attack weak points, Logic for precision, and Adaptability to counter dynamically.",
  },
  consistency: {
    stats: ["logic", "knowledge"],
    tip: "Stay consistent by boosting Logic (structured thinking) and Knowledge (factual grounding).",
  },
  persuasion: {
    stats: ["boldness", "creativity", "humor"],
    tip: "More persuasive arguments come from Boldness (strong positions), Creativity (fresh angles), and Humor (audience engagement).",
  },
  expression: {
    stats: ["brevity", "humor", "creativity"],
    tip: "Clearer expression uses Brevity (concise delivery), Humor (engaging tone), and Creativity (vivid language).",
  },
  factual: {
    stats: ["knowledge", "logic"],
    tip: "Factual accuracy depends on Knowledge (domain expertise and precision) and Logic (evidence-based reasoning).",
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
            Battle Analysis Report
          </span>
          <span className="text-xs text-text-muted">{expanded ? "▲" : "▼"}</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {won ? "See what you did well and how to stay dominant." : draw ? "Analyze the stalemate and find an edge." : "Understand what went wrong and how to improve."}
        </p>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Radar Chart */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Score Radar
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
                Opponent
              </span>
            </div>
          </div>

          {/* Branching Point */}
          {!won && branchingTurn && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-warning">
                Branching Point — Turn {branchingTurn.turn}
              </h3>
              <p className="mt-2 text-sm text-text">
                The <strong>{TURN_LABELS[branchingTurn.type]}</strong> phase appears to be where the battle shifted. Your agent&apos;s response was{" "}
                {branchingTurn.ratio < 0.7 ? "significantly shorter" : "relatively thin"} compared to your opponent&apos;s, suggesting a missed opportunity to develop stronger arguments.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Near-miss: Small improvements in this turn could flip the outcome.
              </p>
            </div>
          )}

          {/* Weakest Criteria */}
          {worstCriteria.gap > 0 && (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-danger">
                Biggest Gap: {CRITERIA.find((c) => c.key === worstCriteria.key)?.label}
              </h3>
              <p className="mt-2 text-sm text-text">
                You scored <strong>{worstCriteria.myVal}</strong> vs opponent&apos;s{" "}
                <strong>{worstCriteria.theirVal}</strong> ({worstCriteria.gap} point gap).
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
                {won ? "Keep Your Edge" : "Recommended Stat Upgrades"}
              </h3>
              <div className="mt-3 space-y-2">
                {recommendations.map(({ stat, reason }) => {
                  const label = STAT_LABELS[stat];
                  return (
                    <div key={stat} className="flex items-start gap-2">
                      <span className="text-lg">{label.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-text">
                          {label.en}: {userAgent.stats[stat]} → {Math.min(userAgent.stats[stat] + 2, 10)}
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
                Edit Agent Stats
              </a>
            </div>
          )}

          {/* Per-Turn Summary */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Turn-by-Turn Assessment
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
  { key: "logic" as const, label: "Argumentation" },
  { key: "rebuttal" as const, label: "Rebuttal" },
  { key: "consistency" as const, label: "Consistency" },
  { key: "persuasion" as const, label: "Persuasion" },
  { key: "expression" as const, label: "Expression" },
  { key: "factual" as const, label: "Factual Accuracy" },
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
        <span className="text-success">{nameA} (PRO)</span>
        <span className="text-danger">{nameB} (CON)</span>
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
        <span className="text-sm font-medium text-text-muted">TOTAL</span>
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
    `Topic: "${battle.topic}" [${difficulty}]`,
    `Score: ${scoreA}–${scoreB}`,
    winnerName ? `Winner: ${winnerName}` : "Draw!",
    `ELO: ${agentA.name} ${battle.elo_change_a > 0 ? "+" : ""}${battle.elo_change_a} | ${agentB.name} ${battle.elo_change_b > 0 ? "+" : ""}${battle.elo_change_b}`,
    "",
    `Watch the replay: ${typeof window !== "undefined" ? window.location.href : ""}`,
    "",
    "Agentopia — AI Debate Arena",
    "agentopia.online",
  ].join("\n");

  async function handleShare() {
    // Try Web Share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${agentA.name} vs ${agentB.name} — Agentopia`,
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
            {difficulty}
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
            <p className="text-xs text-success">PRO</p>
            <p className="text-sm font-bold text-text">{agentA.name}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-text">
              {scoreA}<span className="text-text-muted">–</span>{scoreB}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-danger">CON</p>
            <p className="text-sm font-bold text-text">{agentB.name}</p>
          </div>
        </div>
        {winnerName && (
          <p className="mt-3 text-center text-sm font-bold text-warning">
            {winnerName} Wins!
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
        {copied ? "Copied to clipboard!" : "Share Battle Result"}
      </button>
    </div>
  );
}
