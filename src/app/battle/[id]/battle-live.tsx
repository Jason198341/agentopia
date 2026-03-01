"use client";

import { createClient } from "@/lib/supabase/client";
import type { Agent } from "@/types/agent";
import type { Battle, BattleTurn } from "@/types/battle";
import { TURN_SEQUENCE, dbToBattleTurn } from "@/types/battle";
import { getTierForElo } from "@/lib/tiers";
import { useState, useEffect, useRef } from "react";

const TURN_LABELS: Record<string, string> = {
  opening: "오프닝",
  rebuttal: "반박",
  counter: "재반박",
  free: "자유 토론",
  closing: "마무리 발언",
};

interface Props {
  battle: Battle;
  agentA: Agent;
  agentB: Agent;
  userId: string;
  initialTurns: BattleTurn[];
}

export function BattleLive({ battle, agentA, agentB, userId, initialTurns }: Props) {
  const [turns, setTurns] = useState<BattleTurn[]>(initialTurns);
  const [currentTurn, setCurrentTurn] = useState(battle.current_turn);
  const [status, setStatus] = useState(battle.status);
  const [errorMessage, setErrorMessage] = useState(battle.error_message);
  const [completedBattle, setCompletedBattle] = useState<Battle | null>(
    battle.status === "completed" ? battle : null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest turn
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  // Subscribe to Realtime
  useEffect(() => {
    const supabase = createClient();

    // Channel for battle_turns INSERT
    const turnsChannel = supabase
      .channel(`battle-turns-${battle.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "battle_turns",
          filter: `battle_id=eq.${battle.id}`,
        },
        (payload) => {
          const newTurn = dbToBattleTurn(payload.new as Record<string, unknown>);
          setTurns((prev) => {
            // Deduplicate by id
            if (prev.some((t) => t.id === newTurn.id)) return prev;
            return [...prev, newTurn].sort((a, b) => {
              if (a.turn_number !== b.turn_number) return a.turn_number - b.turn_number;
              return a.role === "pro" ? -1 : 1;
            });
          });
        },
      )
      .subscribe();

    // Channel for battles UPDATE (current_turn, status)
    const battleChannel = supabase
      .channel(`battle-status-${battle.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battles",
          filter: `id=eq.${battle.id}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (typeof updated.current_turn === "number") {
            setCurrentTurn(updated.current_turn);
          }
          if (typeof updated.status === "string") {
            setStatus(updated.status as Battle["status"]);
          }
          if (typeof updated.error_message === "string") {
            setErrorMessage(updated.error_message);
          }
          if (updated.status === "completed") {
            // Fetch the full updated battle for scores/ELO
            supabase
              .from("battles")
              .select("*")
              .eq("id", battle.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setCompletedBattle({
                    ...battle,
                    status: "completed",
                    winner_id: data.winner_id as string | null,
                    score_a: data.score_a as Battle["score_a"],
                    score_b: data.score_b as Battle["score_b"],
                    elo_change_a: data.elo_change_a as number,
                    elo_change_b: data.elo_change_b as number,
                    completed_at: data.completed_at as string,
                  });
                }
              });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(turnsChannel);
      supabase.removeChannel(battleChannel);
    };
  }, [battle.id]);

  // If completed, redirect to full replay
  useEffect(() => {
    if (completedBattle) {
      // Small delay so user sees the completion
      const t = setTimeout(() => {
        window.location.reload(); // Reload to get server-rendered BattleReplay
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [completedBattle]);

  // Group turns by turn_number
  const turnPairs = TURN_SEQUENCE.map((seq) => {
    const pro = turns.find((t) => t.turn_number === seq.turn && t.role === "pro");
    const con = turns.find((t) => t.turn_number === seq.turn && t.role === "con");
    return { turnNumber: seq.turn, type: seq.type, pro, con };
  });

  const progress = Math.round((currentTurn / 5) * 100);
  const isAborted = status === "aborted";

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

      {/* Progress Bar */}
      {!isAborted && !completedBattle && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary-dim p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <LiveDot />
              <span className="font-medium text-primary">실시간 토론 중...</span>
            </div>
            <span className="font-mono text-primary">{currentTurn}/5</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={currentTurn}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-label={`배틀 진행 상황: ${currentTurn}/5턴`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed banner */}
      {completedBattle && (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-center">
          <p className="font-medium text-success">배틀 완료! 결과를 불러오는 중...</p>
        </div>
      )}

      {/* Aborted */}
      {isAborted && (
        <div role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-center text-sm text-danger">
          {errorMessage || "이 배틀은 오류로 인해 중단되었습니다."}
          <a href="/battle" className="ml-2 underline hover:text-danger/80">
            다시 시도
          </a>
        </div>
      )}

      {/* Waiting for first turn */}
      {turns.length === 0 && !isAborted && !completedBattle && (
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-text-muted">
          <div className="flex gap-1">
            <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "0ms" }} />
            <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "150ms" }} />
            <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm">워커가 배틀을 처리하는 중입니다...</p>
        </div>
      )}

      {/* Turns (live) */}
      <div className="mt-6 space-y-4">
        {turnPairs.map((pair) => {
          if (!pair.pro && !pair.con) return null;
          return (
            <div key={pair.turnNumber} className="space-y-2 anim-fade-in">
              <p className="text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                {pair.turnNumber}턴 &mdash; {TURN_LABELS[pair.type]}
              </p>

              {/* PRO message */}
              {pair.pro && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 anim-slide-left">
                  <p className="mb-1 text-xs font-medium text-success">
                    {agentA.name} (찬성)
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text">
                    {pair.pro.content}
                  </p>
                </div>
              )}

              {/* Waiting for CON */}
              {pair.pro && !pair.con && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 animate-pulse">
                  <p className="mb-1 text-xs font-medium text-danger">{agentB.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted/40" style={{ animationDelay: "0ms" }} />
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted/40" style={{ animationDelay: "150ms" }} />
                    <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-text-muted/40" style={{ animationDelay: "300ms" }} />
                    <span className="ml-2 text-xs text-text-muted">반박 준비 중...</span>
                  </div>
                </div>
              )}

              {/* CON message */}
              {pair.con && (
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

      {/* Waiting for next turn (after last visible turn) */}
      {turns.length > 0 && !completedBattle && !isAborted && currentTurn < 5 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-text-muted animate-pulse">
            다음 턴 준비 중...
          </p>
        </div>
      )}

      {/* Judge waiting */}
      {currentTurn >= 5 && !completedBattle && !isAborted && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-warning animate-pulse">
            심판이 판정 중입니다...
          </p>
        </div>
      )}

      <div ref={bottomRef} />
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
