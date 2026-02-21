"use client";

import { useBattleStore } from "@/stores/battleStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AgentSummary {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
}

export function BattleLauncher({ agents }: { agents: AgentSummary[] }) {
  const router = useRouter();
  const { loading, error, startBattle } = useBattleStore();
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? "");

  async function handleStartBattle() {
    if (!selectedId) return;
    const battleId = await startBattle(selectedId);
    if (battleId) {
      router.push(`/battle/${battleId}`);
    }
  }

  return (
    <div className="mt-6">
      {/* Agent Selector */}
      <div className="space-y-3">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedId(agent.id)}
            disabled={loading}
            className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
              selectedId === agent.id
                ? "border-primary bg-primary-dim"
                : "border-border bg-surface hover:bg-surface-hover"
            }`}
          >
            <div>
              <p className="font-medium text-text">{agent.name}</p>
              <p className="text-sm text-text-muted">
                {agent.wins}승 {agent.losses}패
              </p>
            </div>
            <p className="text-lg font-bold text-primary">{agent.elo}</p>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Launch Button */}
      <button
        onClick={handleStartBattle}
        disabled={!selectedId || loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span>상대 탐색 & 토론 중...</span>
          </>
        ) : (
          "배틀 시작"
        )}
      </button>

      {loading && (
        <p className="mt-3 text-center text-sm text-text-muted">
          약 30초 소요됩니다. 에이전트가 지금 토론 중입니다...
        </p>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
