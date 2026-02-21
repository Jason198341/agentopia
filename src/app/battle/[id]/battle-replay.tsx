"use client";

import type { Agent } from "@/types/agent";
import type { Battle, BattleTurn, BattleScore } from "@/types/battle";
import { TURN_SEQUENCE } from "@/types/battle";
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

  return (
    <div>
      {/* Header */}
      <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
        &larr; Dashboard
      </a>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-center text-xs uppercase tracking-wider text-text-muted">
          {battle.topic_category}
        </p>
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
        </div>
      )}
    </div>
  );
}

// ─── Score Comparison Bars ───

const CRITERIA = [
  { key: "logic" as const, label: "Argumentation" },
  { key: "rebuttal" as const, label: "Rebuttal" },
  { key: "consistency" as const, label: "Consistency" },
  { key: "persuasion" as const, label: "Persuasion" },
  { key: "expression" as const, label: "Expression" },
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
        const a = scoreA[key];
        const b = scoreB[key];
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
