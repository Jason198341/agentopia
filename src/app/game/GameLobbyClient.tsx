"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeFetch, NetworkError, ApiError } from '@/lib/api-error';

interface GameRecord {
  id: string;
  status: 'running' | 'completed';
  current_turn: number;
  max_turns: number;
  winner_id: string | null;
  created_at: string;
}

interface Props {
  games: GameRecord[];
}

const AGENT_NAMES: Record<string, string> = {
  agent_0: '화영국',
  agent_1: '청풍국',
  agent_2: '황금국',
  agent_3: '흑산국',
};

export function GameLobbyClient({ games }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await safeFetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.game_id) {
        router.push(`/game/${data.game_id}`);
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        setCreateError(err.message);
      } else if (err instanceof ApiError) {
        setCreateError(`게임 생성 실패 (${err.status})`);
      } else {
        setCreateError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            ⚔️ AI 삼국지
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            4개 AI 세력이 5×5 전장에서 패권을 다툽니다.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {creating ? '게임 생성 중...' : '새 전쟁 시작'}
        </button>
      </div>

      {createError && (
        <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {createError}
        </div>
      )}

      {/* Factions preview */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { name: '화영국', color: '#ef4444', role: '호전적 군주', icon: '🔴' },
          { name: '청풍국', color: '#06b6d4', role: '신중한 재상', icon: '🔵' },
          { name: '황금국', color: '#fbbf24', role: '균형잡힌 군주', icon: '🟡' },
          { name: '흑산국', color: '#8b5cf6', role: '교활한 책사', icon: '🟣' },
        ].map((faction) => (
          <div
            key={faction.name}
            className="rounded-lg border p-3"
            style={{ borderColor: `${faction.color}40`, backgroundColor: `${faction.color}0d` }}
          >
            <div className="text-lg mb-1">{faction.icon}</div>
            <div className="font-bold text-text text-sm">{faction.name}</div>
            <div className="text-xs text-text-muted">{faction.role}</div>
          </div>
        ))}
      </div>

      {/* Game list */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
          전쟁 기록
        </h2>

        {games.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-text-muted">아직 전쟁이 없습니다. 첫 전쟁을 시작하세요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <a
                key={game.id}
                href={`/game/${game.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-hover transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      game.status === 'running'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {game.status === 'running' ? '진행 중' : '완료'}
                  </span>
                  <span className="text-sm text-text">
                    {game.current_turn}/{game.max_turns}턴
                  </span>
                  {game.winner_id && (
                    <span className="text-sm text-amber-400">
                      👑 {AGENT_NAMES[game.winner_id] ?? game.winner_id}
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(game.created_at).toLocaleDateString('ko-KR')}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
