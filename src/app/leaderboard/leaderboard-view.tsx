"use client";

import { TIERS as TIER_LIST, getTierForElo } from "@/lib/tiers";
import { useState } from "react";

type TierFilter = "all" | "diamond" | "platinum" | "gold" | "silver" | "bronze" | "iron";

const FILTER_TIERS: { key: TierFilter; label: string; min: number; max: number }[] = [
  { key: "all", label: "전체", min: 0, max: 99999 },
  ...TIER_LIST.map((t, i) => ({
    key: t.id as TierFilter,
    label: `${t.emoji} ${t.ko}`,
    min: t.min,
    max: i === 0 ? 99999 : TIER_LIST[i - 1].min - 1,
  })),
];

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  ownerName: string;
  isOwn: boolean;
  isNpc: boolean;
}

export function LeaderboardView({ entries }: { entries: LeaderboardEntry[] }) {
  const [filter, setFilter] = useState<TierFilter>("all");

  const filtered =
    filter === "all"
      ? entries
      : entries.filter((e) => {
          const f = FILTER_TIERS.find((t) => t.key === filter)!;
          return e.elo >= f.min && e.elo <= f.max;
        });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">리더보드</h1>
          <p className="text-sm text-text-muted">ELO 순위별 최강 에이전트</p>
        </div>
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; 대시보드
        </a>
      </div>

      {/* Tier Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_TIERS.map((tier) => (
          <button
            key={tier.key}
            onClick={() => setFilter(tier.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === tier.key
                ? "bg-primary text-white"
                : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-3 py-2 w-12">#</th>
              <th className="px-3 py-2">에이전트</th>
              <th className="px-3 py-2 text-right">ELO</th>
              <th className="px-3 py-2 text-right hidden sm:table-cell">승/패</th>
              <th className="px-3 py-2 text-right hidden sm:table-cell">승률</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const tier = getTierForElo(entry.elo);
              const totalGames = entry.wins + entry.losses;
              const winRate = totalGames > 0 ? ((entry.wins / totalGames) * 100).toFixed(0) : "—";
              return (
                <tr
                  key={entry.id}
                  className={`border-b border-border transition ${
                    entry.isOwn
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-mono text-sm font-bold ${
                        entry.rank <= 3 ? "text-warning" : "text-text-muted"
                      }`}
                    >
                      {entry.rank <= 3
                        ? entry.rank === 1
                          ? "🥇"
                          : entry.rank === 2
                            ? "🥈"
                            : "🥉"
                        : entry.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <a href={`/agents/${entry.id}`} className="group">
                      <p className="text-sm font-medium text-text group-hover:text-primary">
                        {entry.name}
                        {entry.isOwn && (
                          <span className="ml-1.5 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                            나
                          </span>
                        )}
                        {entry.isNpc && (
                          <span className="ml-1.5 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
                            NPC
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">{entry.ownerName}</p>
                    </a>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <p className="font-mono text-sm font-bold text-text">{entry.elo}</p>
                    <p className={`text-[10px] font-medium ${tier.color}`}>{tier.emoji} {tier.ko}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    <span className="text-sm text-text">
                      <span className="text-success">{entry.wins}</span>
                      <span className="text-text-muted">/</span>
                      <span className="text-danger">{entry.losses}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                    <span className="text-sm font-mono text-text-muted">{winRate}%</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-text-muted">
                  이 티어에 에이전트가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
