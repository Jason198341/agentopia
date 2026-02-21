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
    name: "첫 승리",
    emoji: "🎯",
    description: "첫 번째 배틀에서 승리",
    condition: "1승 달성",
  },
  {
    id: "streak_3",
    name: "불꽃 연승",
    emoji: "🔥",
    description: "3연승 달성",
    condition: "3연승",
  },
  {
    id: "streak_5",
    name: "멈출 수 없다",
    emoji: "⚡",
    description: "5연승 달성",
    condition: "5연승",
  },
  {
    id: "streak_10",
    name: "전설",
    emoji: "👑",
    description: "10연승 달성",
    condition: "10연승",
  },
  {
    id: "comeback",
    name: "불사조",
    emoji: "🦅",
    description: "패배 후 3연승으로 역전",
    condition: "패배 후 3연승",
  },
  {
    id: "giant_slayer",
    name: "자이언트 킬러",
    emoji: "⚔️",
    description: "ELO 200+ 높은 상대를 격파",
    condition: "상위 티어 격파",
  },
  {
    id: "veteran",
    name: "베테랑",
    emoji: "🏅",
    description: "10회 배틀 완료",
    condition: "총 10회 배틀",
  },
  {
    id: "close_call",
    name: "아슬아슬",
    emoji: "😰",
    description: "3점 이하 차이로 승리",
    condition: "승리 마진 3점 이하",
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
