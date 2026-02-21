"use client";

import { useState, useTransition } from 'react';
import { GameMap } from '@/components/game/GameMap';
import { AgentPanel } from '@/components/game/AgentPanel';
import { TurnLog } from '@/components/game/TurnLog';
import type { SGGameState, TurnEvent } from '@/types/sangokji';

const AGENT_COLORS: Record<string, string> = {
  agent_0: '#ef4444',
  agent_1: '#06b6d4',
  agent_2: '#fbbf24',
  agent_3: '#8b5cf6',
};

interface Props {
  gameId: string;
  initialState: SGGameState;
  initialTurnEvents: { turn: number; events: TurnEvent[] }[];
}

export function GameViewerClient({ gameId, initialState, initialTurnEvents }: Props) {
  const [state, setState] = useState<SGGameState>(initialState);
  const [turnEvents, setTurnEvents] = useState(initialTurnEvents);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isCompleted = state.status === 'completed';
  const progress = Math.round((state.turn / state.max_turns) * 100);

  function handleRunTurns(count: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/game/${gameId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns: count }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.');
        return;
      }

      setState(data.state);

      const newTurnEvents: { turn: number; events: TurnEvent[] }[] = (
        data.events as TurnEvent[][]
      ).map((events, i) => ({
        turn: state.turn + i + 1,
        events,
      }));

      setTurnEvents((prev) => [...prev, ...newTurnEvents]);
    });
  }

  const winner = isCompleted
    ? state.agents.find((a) => a.id === state.winner_id)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/game" className="text-text-muted hover:text-text text-sm">
            ← 목록
          </a>
          <h1 className="text-xl font-bold text-text">⚔️ AI 삼국지</h1>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              <button
                onClick={() => handleRunTurns(1)}
                disabled={isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover disabled:opacity-50 transition"
              >
                1턴
              </button>
              <button
                onClick={() => handleRunTurns(5)}
                disabled={isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:bg-surface-hover disabled:opacity-50 transition"
              >
                5턴
              </button>
              <button
                onClick={() => handleRunTurns(10)}
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {isPending ? 'AI 결정 중...' : '10턴 실행'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 rounded-full bg-surface h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: winner
              ? (AGENT_COLORS[winner.id] ?? '#8b5cf6')
              : '#8b5cf6',
          }}
        />
      </div>

      {/* Victory banner */}
      {winner && (
        <div
          className="mb-4 rounded-xl border p-4 text-center"
          style={{
            borderColor: `${AGENT_COLORS[winner.id] ?? '#8b5cf6'}60`,
            backgroundColor: `${AGENT_COLORS[winner.id] ?? '#8b5cf6'}15`,
          }}
        >
          <div className="text-2xl mb-1">👑</div>
          <div className="text-lg font-bold text-text">
            {winner.name} 천하 통일!
          </div>
          <div className="text-sm text-text-muted">
            {state.turn}턴 만에 패권 달성 · 영토 {winner.territory.length}칸 · 병력 {winner.troops}명
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GameMap state={state} />
        <AgentPanel agents={state.agents} />
      </div>

      <div className="mt-4">
        <TurnLog
          turnEvents={turnEvents}
          agents={state.agents.map((a) => ({
            id: a.id,
            color: a.color,
            name: a.name,
          }))}
        />
      </div>
    </div>
  );
}
