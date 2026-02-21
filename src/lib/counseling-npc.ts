import { createAdminClient } from "@/lib/supabase/admin";
import { fireworksCompletion } from "@/lib/ai";
import { COUNSELING_NPCS, NPC_RESPONDER_ID } from "@/data/counseling-npcs";

// ─── NPC System Prompt ───

function buildNpcSystemPrompt(
  npc: (typeof COUNSELING_NPCS)[number],
  postContent: string,
  emotionTags: string[],
): string {
  const emotions = emotionTags.join(", ");
  return [
    `You are ${npc.name} (${npc.nameKo}), a ${npc.persona} offering counseling support.`,
    "",
    "Their situation:",
    `"${postContent}"`,
    "",
    `Detected emotions: ${emotions || "unspecified"}`,
    "",
    `Your style: ${npc.style}`,
    "",
    "Rules:",
    "- Write your response in 250 characters or less",
    "- End with a specific, actionable suggestion",
    "- Do NOT diagnose or label the person",
    "- Do NOT mention you are an AI",
    "- Match the language of the post (Korean → Korean, English → English)",
    "- Be genuinely helpful — this is a real person seeking support",
  ].join("\n");
}

// ─── Trigger all 3 NPC responses for a new counseling post ───
// Called fire-and-forget from posts/route.ts — never awaited by the request handler.

export async function triggerNpcResponses(
  postId: string,
  postContent: string,
  emotionTags: string[],
): Promise<void> {
  const admin = createAdminClient();

  await Promise.allSettled(
    COUNSELING_NPCS.map(async (npc) => {
      try {
        const systemPrompt = buildNpcSystemPrompt(npc, postContent, emotionTags);
        const result = await fireworksCompletion({
          systemPrompt,
          userPrompt: "Please provide your counseling advice now.",
          maxTokens: 400,
          temperature: 0.75,
        });

        await admin.from("counseling_responses").insert({
          post_id: postId,
          responder_id: NPC_RESPONDER_ID, // sentinel UUID — not in profiles (FK removed)
          agent_id: null,                 // NPC has no real agent row
          content: result.content,
          is_npc: true,
          npc_name: npc.name,
        });
      } catch {
        // Silent fail — NPC response failure must not affect user flow
      }
    }),
  );

  // Update response_count once after all NPCs complete — avoids race condition
  // from concurrent read-then-write increments
  const { count } = await admin
    .from("counseling_responses")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  await admin
    .from("counseling_posts")
    .update({ response_count: count ?? 0 })
    .eq("id", postId);
}
