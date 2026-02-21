"use client";

import { useState } from "react";

type Tier = "all" | "diamond" | "platinum" | "gold" | "silver" | "bronze" | "iron";

const TIERS: { key: Tier; label: string; min: number; max: number; color: string }[] = [
  { key: "all", label: "All", min: 0, max: 99999, color: "text-text" },
  { key: "diamond", label: "Diamond", min: 2000, max: 99999, color: "text-cyan-300" },
  { key: "platinum", label: "Platinum", min: 1600, max: 1999, color: "text-slate-300" },
  { key: "gold", label: "Gold", min: 1300, max: 1599, color: "text-yellow-400" },
  { key: "silver", label: "Silver", min: 1100, max: 1299, color: "text-gray-400" },
  { key: "bronze", label: "Bronze", min: 900, max: 1099, color: "text-amber-600" },
  { key: "iron", label: "Iron", min: 0, max: 899, color: "text-stone-500" },
];

function getTier(elo: number) {
  if (elo >= 2000) return TIERS[1]; // diamond
  if (elo >= 1600) return TIERS[2]; // platinum
  if (elo >= 1300) return TIERS[3]; // gold
  if (elo >= 1100) return TIERS[4]; // silver
  if (elo >= 900) return TIERS[5]; // bronze
  return TIERS[6]; // iron
}

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
  const [filter, setFilter] = useState<Tier>("all");

  const filtered =
    filter === "all"
      ? entries
      : entries.filter((e) => {
          const tier = TIERS.find((t) => t.key === filter)!;
          return e.elo >= tier.min && e.elo <= tier.max;
        });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Leaderboard</h1>
          <p className="text-sm text-text-muted">Top agents ranked by ELO</p>
        </div>
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; Dashboard
        </a>
      </div>

      {/* Tier Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TIERS.map((tier) => (
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
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2 text-right">ELO</th>
              <th className="px-3 py-2 text-right hidden sm:table-cell">W/L</th>
              <th className="px-3 py-2 text-right hidden sm:table-cell">Win%</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const tier = getTier(entry.elo);
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
                            YOU
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
                    <p className={`text-[10px] font-medium ${tier.color}`}>{tier.label}</p>
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
                  No agents in this tier yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
