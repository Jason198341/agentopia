export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string; // human-readable condition
}

// All possible badges from P011
export const BADGES: Badge[] = [
  {
    id: "first_win",
    name: "First Blood",
    emoji: "🎯",
    description: "Won your first battle",
    condition: "Win 1 battle",
  },
  {
    id: "streak_3",
    name: "On Fire",
    emoji: "🔥",
    description: "Won 3 battles in a row",
    condition: "3-win streak",
  },
  {
    id: "streak_5",
    name: "Unstoppable",
    emoji: "⚡",
    description: "Won 5 battles in a row",
    condition: "5-win streak",
  },
  {
    id: "streak_10",
    name: "Legendary",
    emoji: "👑",
    description: "Won 10 battles in a row",
    condition: "10-win streak",
  },
  {
    id: "comeback",
    name: "Phoenix",
    emoji: "🦅",
    description: "Won 3 battles after a loss",
    condition: "Win 3 after losing",
  },
  {
    id: "giant_slayer",
    name: "Giant Slayer",
    emoji: "⚔️",
    description: "Beat an opponent 200+ ELO higher",
    condition: "Beat higher-tier opponent",
  },
  {
    id: "veteran",
    name: "Veteran",
    emoji: "🏅",
    description: "Completed 10 battles",
    condition: "10 total battles",
  },
  {
    id: "close_call",
    name: "Close Call",
    emoji: "😰",
    description: "Won a battle by 3 points or less",
    condition: "Win margin <= 3",
  },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b]));

// Check which new badges an agent earned after a battle
export function checkNewBadges(
  existingBadges: string[],
  context: {
    won: boolean;
    totalWins: number;
    totalBattles: number;
    winMargin: number;
    opponentElo: number;
    agentElo: number;
    recentResults: ("win" | "loss")[]; // most recent first
  },
): string[] {
  const newBadges: string[] = [];
  const has = (id: string) => existingBadges.includes(id);

  // First Win
  if (!has("first_win") && context.won && context.totalWins >= 1) {
    newBadges.push("first_win");
  }

  // Veteran (10 battles)
  if (!has("veteran") && context.totalBattles >= 10) {
    newBadges.push("veteran");
  }

  // Win streaks (check recent results)
  if (context.won) {
    const streak = countStreak(context.recentResults);
    if (!has("streak_3") && streak >= 3) newBadges.push("streak_3");
    if (!has("streak_5") && streak >= 5) newBadges.push("streak_5");
    if (!has("streak_10") && streak >= 10) newBadges.push("streak_10");
  }

  // Giant Slayer
  if (!has("giant_slayer") && context.won && context.opponentElo - context.agentElo >= 200) {
    newBadges.push("giant_slayer");
  }

  // Close Call
  if (!has("close_call") && context.won && context.winMargin <= 3 && context.winMargin > 0) {
    newBadges.push("close_call");
  }

  // Phoenix (comeback: loss then 3 wins)
  if (!has("comeback") && context.won) {
    // Check pattern: recent should be [win, win, win, loss, ...]
    const r = context.recentResults;
    if (r.length >= 4 && r[0] === "win" && r[1] === "win" && r[2] === "win" && r[3] === "loss") {
      newBadges.push("comeback");
    }
  }

  return newBadges;
}

function countStreak(results: ("win" | "loss")[]): number {
  let streak = 0;
  for (const r of results) {
    if (r === "win") streak++;
    else break;
  }
  return streak;
}
