import type { Agent } from "./agent";

// ─── Core Interfaces ───

export interface CounselingPost {
  id: string;
  author_id: string;
  agent_id: string;
  raw_input: string;
  organized_content: string;
  emotion_tags: string[];
  status: "open" | "resolved";
  best_response_id: string | null;
  is_crisis: boolean;
  response_count: number;
  created_at: string;
  resolved_at: string | null;
}

export interface CounselingResponse {
  id: string;
  post_id: string;
  responder_id: string;
  agent_id: string;
  content: string;
  is_best: boolean;
  is_npc: boolean;
  npc_name: string | null;
  created_at: string;
}

// ─── Joined types for UI ───

export interface CounselingPostWithAuthor extends CounselingPost {
  author_name: string;
  agent_name: string;
}

export interface CounselingResponseWithAgent extends CounselingResponse {
  responder_name: string;
  agent_name: string;
  agent: Agent | null;
}

// ─── DB Row → Type Converters ───

export function dbToCounselingPost(row: Record<string, unknown>): CounselingPost {
  return {
    id: row.id as string,
    author_id: row.author_id as string,
    agent_id: row.agent_id as string,
    raw_input: row.raw_input as string,
    organized_content: (row.organized_content as string) ?? "",
    emotion_tags: (row.emotion_tags as string[]) ?? [],
    status: row.status as CounselingPost["status"],
    best_response_id: (row.best_response_id as string) ?? null,
    is_crisis: (row.is_crisis as boolean) ?? false,
    response_count: (row.response_count as number) ?? 0,
    created_at: row.created_at as string,
    resolved_at: (row.resolved_at as string) ?? null,
  };
}

export function dbToCounselingResponse(row: Record<string, unknown>): CounselingResponse {
  return {
    id: row.id as string,
    post_id: row.post_id as string,
    responder_id: row.responder_id as string,
    agent_id: row.agent_id as string,
    content: (row.content as string) ?? "",
    is_best: (row.is_best as boolean) ?? false,
    is_npc: (row.is_npc as boolean) ?? false,
    npc_name: (row.npc_name as string) ?? null,
    created_at: row.created_at as string,
  };
}

// ─── Crisis Detection ───

export const CRISIS_KEYWORDS = [
  "자살", "죽고 싶", "죽을", "죽겠", "목숨", "유서",
  "suicide", "kill myself", "end my life", "want to die",
  "자해", "self-harm", "cutting",
];

export function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Emotion Labels ───

export const EMOTION_LABELS: Record<string, { emoji: string; ko: string; en: string }> = {
  anxiety: { emoji: "😰", ko: "불안", en: "Anxiety" },
  loneliness: { emoji: "😔", ko: "외로움", en: "Loneliness" },
  anger: { emoji: "😤", ko: "분노", en: "Anger" },
  sadness: { emoji: "😢", ko: "슬픔", en: "Sadness" },
  fear: { emoji: "😨", ko: "두려움", en: "Fear" },
  confusion: { emoji: "😵", ko: "혼란", en: "Confusion" },
  guilt: { emoji: "😣", ko: "죄책감", en: "Guilt" },
  shame: { emoji: "😳", ko: "수치심", en: "Shame" },
  frustration: { emoji: "😩", ko: "좌절", en: "Frustration" },
  exhaustion: { emoji: "😫", ko: "소진", en: "Exhaustion" },
  hope: { emoji: "🌱", ko: "희망", en: "Hope" },
  gratitude: { emoji: "🙏", ko: "감사", en: "Gratitude" },
};

export function getEmotionLabel(tag: string): { emoji: string; ko: string; en: string } {
  return EMOTION_LABELS[tag] ?? { emoji: "💭", ko: tag, en: tag };
}
