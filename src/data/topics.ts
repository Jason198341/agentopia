import type { Specialty } from "@/types/agent";

export type TopicDifficulty = "casual" | "standard" | "advanced";

export interface DebateTopic {
  topic: string;
  category: Specialty;
  difficulty: TopicDifficulty;
}

// 하드코딩 주제는 최소한의 비상 폴백만 유지합니다.
// 실제 토론 주제는 DB(topics 테이블)에서 관리자가 관리합니다.
export const DEBATE_TOPICS: DebateTopic[] = [
  // casual fallback
  { topic: "안드로이드가 아이폰보다 낫다", category: "technology", difficulty: "casual" },
  { topic: "개가 고양이보다 좋은 반려동물이다", category: "psychology", difficulty: "casual" },
  { topic: "학교 숙제는 폐지해야 한다", category: "ethics", difficulty: "casual" },
  // standard fallback
  { topic: "SNS는 사회에 득보다 해를 끼쳤다", category: "technology", difficulty: "standard" },
  { topic: "기본소득이 기존 복지 시스템을 대체해야 한다", category: "economics", difficulty: "standard" },
  { topic: "개인 프라이버시가 국가 안보보다 중요하다", category: "ethics", difficulty: "standard" },
  // advanced fallback
  { topic: "자유의지는 환상이다", category: "philosophy", difficulty: "advanced" },
  { topic: "자본주의는 빈곤 감소를 위한 최선의 경제 체제다", category: "economics", difficulty: "advanced" },
  { topic: "민주주의는 가장 효과적인 통치 형태다", category: "politics", difficulty: "advanced" },
];

/** Pick a random topic, optionally filtered by difficulty. */
export function pickRandomTopic(difficulty?: TopicDifficulty): DebateTopic {
  const pool = difficulty
    ? DEBATE_TOPICS.filter((t) => t.difficulty === difficulty)
    : DEBATE_TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick topic with ELO-based difficulty: <1000 casual, 1000-1500 standard, 1500+ advanced */
export function pickTopicForElo(elo: number): DebateTopic {
  if (elo < 1000) return pickRandomTopic("casual");
  if (elo < 1500) return pickRandomTopic("standard");
  return pickRandomTopic("advanced");
}

// ─── DB topic helpers (server-only) ───

export interface DbTopic {
  id: string;
  topic: string;
  category: string;
  difficulty: TopicDifficulty;
  is_active: boolean;
  use_count: number;
  pro_wins: number;
  con_wins: number;
}

/**
 * Fetch a random topic from DB, weighted by use_count (less used = higher chance).
 * Falls back to hardcoded topics if DB is empty or fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pickTopicFromDb(
  admin: any,
  elo: number,
): Promise<{ topic: string; category: string; topicId?: string }> {
  const difficulty: TopicDifficulty =
    elo < 1000 ? "casual" : elo < 1500 ? "standard" : "advanced";

  try {
    // Fetch active topics for this difficulty, ordered by use_count ASC (least used first)
    const { data: topics } = await admin
      .from("topics")
      .select("id, topic, category, use_count")
      .eq("is_active", true)
      .eq("difficulty", difficulty)
      .order("use_count", { ascending: true })
      .limit(10);

    if (topics && topics.length > 0) {
      // Pick from top 5 least-used (randomized)
      const pool = topics.slice(0, Math.min(5, topics.length));
      const picked = pool[Math.floor(Math.random() * pool.length)];

      // Increment use_count (fire-and-forget)
      admin.from("topics").update({ use_count: picked.use_count + 1 }).eq("id", picked.id);

      return { topic: picked.topic, category: picked.category, topicId: picked.id };
    }
  } catch {
    // Fall through to hardcoded fallback
  }

  // Fallback to hardcoded
  const fallback = pickTopicForElo(elo);
  return { topic: fallback.topic, category: fallback.category };
}
