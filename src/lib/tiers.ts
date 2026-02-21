// ─── ELO-based Tier System ───
// Shared across dashboard, agent detail, leaderboard, battle replay

export interface TierInfo {
  id: string;
  label: string;
  ko: string;
  emoji: string;
  min: number;
  color: string; // Tailwind text color class
}

export const TIERS: TierInfo[] = [
  { id: "diamond", label: "Diamond", ko: "다이아몬드", emoji: "💎", min: 2000, color: "text-cyan-300" },
  { id: "platinum", label: "Platinum", ko: "플래티넘", emoji: "⚜️", min: 1600, color: "text-slate-300" },
  { id: "gold", label: "Gold", ko: "골드", emoji: "🏅", min: 1300, color: "text-yellow-400" },
  { id: "silver", label: "Silver", ko: "실버", emoji: "🥈", min: 1100, color: "text-gray-400" },
  { id: "bronze", label: "Bronze", ko: "브론즈", emoji: "🥉", min: 900, color: "text-amber-600" },
  { id: "iron", label: "Iron", ko: "아이언", emoji: "⛏️", min: 0, color: "text-stone-500" },
];

export function getTierForElo(elo: number): TierInfo {
  for (const tier of TIERS) {
    if (elo >= tier.min) return tier;
  }
  return TIERS[TIERS.length - 1];
}

/** Compact tier badge text: "💎 다이아몬드" */
export function tierBadge(elo: number): string {
  const tier = getTierForElo(elo);
  return `${tier.emoji} ${tier.ko}`;
}

/** Calculate win rate as percentage string */
export function winRate(wins: number, losses: number): string {
  const total = wins + losses;
  return total > 0 ? ((wins / total) * 100).toFixed(0) : "—";
}

/** Calculate current streak from battle results (newest first) */
export function calcStreak(results: ("win" | "loss" | "draw")[]): {
  type: "win" | "loss" | "none";
  count: number;
} {
  if (results.length === 0) return { type: "none", count: 0 };

  const first = results[0];
  if (first === "draw") return { type: "none", count: 0 };

  let count = 0;
  for (const r of results) {
    if (r === first) count++;
    else break;
  }

  return { type: first, count };
}
