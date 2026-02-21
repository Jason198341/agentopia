"use client";

import { useBattleStore } from "@/stores/battleStore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const API_KEY_STORAGE = "agentopia_openai_key";

interface AgentSummary {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
}

export function BattleLauncher({ agents, freeBattles }: { agents: AgentSummary[]; freeBattles: number }) {
  const router = useRouter();
  const { loading, error, startBattle } = useBattleStore();
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? "");
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setHasApiKey(!!localStorage.getItem(API_KEY_STORAGE));
  }, []);

  const isExhausted = freeBattles <= 0;
  const isLow = freeBattles > 0 && freeBattles <= 10;
  const canBattle = isExhausted ? hasApiKey : true;

  async function handleStartBattle() {
    if (!selectedId) return;
    const battleId = await startBattle(selectedId);
    if (battleId) {
      router.push(`/battle/${battleId}`);
    }
  }

  return (
    <div className="mt-6">
      {/* Free Battle Counter */}
      <div className={`mb-4 rounded-xl border p-3 ${
        isExhausted ? "border-danger/40 bg-danger/5" : isLow ? "border-warning/40 bg-warning/5" : "border-border bg-surface"
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">무료 배틀 잔여</span>
          <span className={`text-sm font-bold ${
            isExhausted ? "text-danger" : isLow ? "text-warning" : "text-primary"
          }`}>
            {freeBattles}/50
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${
              isExhausted ? "bg-danger" : isLow ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${Math.round((freeBattles / 50) * 100)}%` }}
          />
        </div>
        {isExhausted && !hasApiKey && (
          <p className="mt-2 text-xs text-danger">
            무료 배틀을 모두 사용했습니다.{" "}
            <a href="/settings" className="text-accent hover:underline">
              설정에서 API 키를 등록
            </a>
            하면 무제한!
          </p>
        )}
        {isExhausted && hasApiKey && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
            <KeyIcon /> API 키 등록됨 — 무제한 배틀 가능
          </p>
        )}
      </div>

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
        disabled={!selectedId || loading || !canBattle}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? (
          <>
            <LoadingSpinner />
            <span>{isExhausted ? "OpenAI로 토론 중..." : "상대 탐색 & 토론 중..."}</span>
          </>
        ) : !canBattle ? (
          "무료 배틀 소진 — API 키 등록 필요"
        ) : isExhausted && hasApiKey ? (
          "배틀 시작 (API 키)"
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

function KeyIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
        clipRule="evenodd"
      />
    </svg>
  );
}
