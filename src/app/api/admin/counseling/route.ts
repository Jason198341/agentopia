import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerNpcResponses } from "@/lib/counseling-npc";
import { NextResponse } from "next/server";

// GET: 상담 현황 통계 (NPC 미응답 글 수 포함)
export async function GET() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 전체 글 수
  const { count: totalPosts } = await admin
    .from("counseling_posts")
    .select("*", { count: "exact", head: true });

  // NPC 응답 없는 글들
  const { data: postsWithoutNpc } = await admin
    .from("counseling_posts")
    .select("id, organized_content, emotion_tags, created_at");

  // 각 글에서 NPC 응답 있는지 체크
  const { data: npcResponses } = await admin
    .from("counseling_responses")
    .select("post_id")
    .eq("is_npc", true);

  const npcRespondedPostIds = new Set((npcResponses ?? []).map((r: { post_id: string }) => r.post_id));
  const missing = (postsWithoutNpc ?? []).filter((p: { id: string }) => !npcRespondedPostIds.has(p.id));

  return NextResponse.json({
    total_posts: totalPosts ?? 0,
    missing_npc_count: missing.length,
    missing_posts: missing.map((p: { id: string; organized_content: string; emotion_tags: string[]; created_at: string }) => ({
      id: p.id,
      preview: (p.organized_content as string).slice(0, 60) + "...",
      created_at: p.created_at,
    })),
  });
}

// POST: NPC 응답 없는 기존 글 일괄 처리
export async function POST() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // NPC 응답 없는 글 전체 fetch
  const { data: allPosts } = await admin
    .from("counseling_posts")
    .select("id, organized_content, emotion_tags");

  const { data: npcResponses } = await admin
    .from("counseling_responses")
    .select("post_id")
    .eq("is_npc", true);

  const npcRespondedPostIds = new Set((npcResponses ?? []).map((r: { post_id: string }) => r.post_id));
  const missing = (allPosts ?? []).filter((p: { id: string }) => !npcRespondedPostIds.has(p.id));

  if (missing.length === 0) {
    return NextResponse.json({ processed: 0, message: "모든 글에 NPC 응답이 이미 있습니다." });
  }

  // 순차 처리 (Fireworks API rate limit 고려)
  let processed = 0;
  for (const post of missing as { id: string; organized_content: string; emotion_tags: string[] }[]) {
    try {
      await triggerNpcResponses(post.id, post.organized_content, post.emotion_tags ?? []);
      processed++;
    } catch {
      // 개별 실패는 무시하고 계속
    }
  }

  return NextResponse.json({
    processed,
    total_missing: missing.length,
    message: `${processed}개 글에 NPC 응답을 생성했습니다.`,
  });
}
