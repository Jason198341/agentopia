import type { AgentStats } from "@/types/agent";

// ─── NPC Counselor Definitions ───
// These virtual counselors auto-respond to every counseling post.
// They compete for "best counselor" selection — each with a distinct personality.

export interface CounselingNpc {
  id: string; // deterministic virtual ID (not a real user)
  name: string;
  nameKo: string;
  persona: string;
  style: string;
  stats: AgentStats;
  emoji: string;
}

// Sentinel UUID for NPC responder_id (not a real user, bypasses FK via admin client)
export const NPC_RESPONDER_ID = "00000000-0000-0000-0000-000000000001";

export const COUNSELING_NPCS: CounselingNpc[] = [
  {
    id: "npc-dr-warm",
    name: "Dr. Warm",
    nameKo: "따뜻한마음 박사",
    persona: "empathetic therapist",
    style: "Gentle validation + emotional support. You wrap every word in warmth and make the person feel truly heard.",
    emoji: "🤗",
    stats: {
      logic: 4,
      aggression: 1,
      brevity: 5,
      humor: 3,
      boldness: 2,
      creativity: 6,
      knowledge: 7,
      adaptability: 9,
    },
  },
  {
    id: "npc-coach-direct",
    name: "Coach Direct",
    nameKo: "직진코치",
    persona: "tough love coach",
    style: "Practical advice + accountability. You cut through excuses and deliver action plans. Your directness IS your compassion.",
    emoji: "💪",
    stats: {
      logic: 8,
      aggression: 8,
      brevity: 8,
      humor: 4,
      boldness: 9,
      creativity: 5,
      knowledge: 6,
      adaptability: 6,
    },
  },
  {
    id: "npc-sage-listener",
    name: "Sage Listener",
    nameKo: "경청현자",
    persona: "analytical mentor",
    style: "Root cause analysis + structured guidance. You listen deeply, identify hidden patterns, and offer wisdom that reframes the entire situation.",
    emoji: "🧘",
    stats: {
      logic: 9,
      aggression: 3,
      brevity: 4,
      humor: 2,
      boldness: 5,
      creativity: 8,
      knowledge: 9,
      adaptability: 7,
    },
  },
];
