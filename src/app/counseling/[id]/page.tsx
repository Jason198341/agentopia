import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { dbToAgent } from "@/types/agent";
import { getEmotionLabel } from "@/types/counseling";
import { PostDetail } from "./post-detail";
import { CrisisBanner } from "./crisis-banner";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "상담 상세" };

export default async function CounselingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch post with author info
  const { data: postRow, error: postErr } = await supabase
    .from("counseling_posts")
    .select("*, profiles!counseling_posts_author_id_fkey(display_name, username), agents!counseling_posts_agent_id_fkey(name)")
    .eq("id", id)
    .single();

  if (postErr || !postRow) notFound();

  const post = {
    id: postRow.id as string,
    author_id: postRow.author_id as string,
    agent_id: postRow.agent_id as string,
    raw_input: postRow.raw_input as string,
    organized_content: postRow.organized_content as string,
    emotion_tags: (postRow.emotion_tags as string[]) ?? [],
    status: postRow.status as "open" | "resolved",
    best_response_id: (postRow.best_response_id as string) ?? null,
    is_crisis: postRow.is_crisis as boolean,
    response_count: postRow.response_count as number,
    created_at: postRow.created_at as string,
    resolved_at: (postRow.resolved_at as string) ?? null,
    author_name: (postRow.profiles as Record<string, string>)?.display_name
      ?? (postRow.profiles as Record<string, string>)?.username ?? "익명",
    agent_name: (postRow.agents as Record<string, string>)?.name ?? "Unknown",
  };

  // Fetch responses plain — FK hints removed after migration 010 dropped FK constraints
  const { data: responseRows } = await supabase
    .from("counseling_responses")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  // Manually resolve profiles for real (non-NPC) responders
  const realResponderIds = (responseRows ?? [])
    .filter((r: Record<string, unknown>) => !r.is_npc)
    .map((r: Record<string, unknown>) => r.responder_id as string)
    .filter(Boolean);

  const profileMap = new Map<string, Record<string, string>>();
  if (realResponderIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", realResponderIds);
    for (const p of profileRows ?? []) {
      profileMap.set(p.id as string, p as Record<string, string>);
    }
  }

  // Manually resolve agents for non-null agent_ids
  const agentIds = (responseRows ?? [])
    .map((r: Record<string, unknown>) => r.agent_id as string)
    .filter(Boolean);

  const agentMap = new Map<string, Record<string, unknown>>();
  if (agentIds.length > 0) {
    const { data: agentRows } = await supabase
      .from("agents")
      .select("*")
      .in("id", agentIds);
    for (const a of agentRows ?? []) {
      agentMap.set(a.id as string, a as Record<string, unknown>);
    }
  }

  const NPC_DISPLAY: Record<string, string> = {
    "Dr. Warm": "🤗 따뜻한마음 박사",
    "Coach Direct": "💪 직진코치",
    "Sage Listener": "🧘 경청현자",
  };

  const responses = (responseRows ?? []).map((r: Record<string, unknown>) => {
    const isNpc = r.is_npc as boolean;
    const npcName = r.npc_name as string | null;
    const profile = isNpc ? null : (profileMap.get(r.responder_id as string) ?? null);
    const agentRow = r.agent_id ? (agentMap.get(r.agent_id as string) ?? null) : null;
    return {
      id: r.id as string,
      post_id: r.post_id as string,
      responder_id: r.responder_id as string,
      agent_id: (r.agent_id as string) ?? null,
      content: r.content as string,
      is_best: r.is_best as boolean,
      is_npc: isNpc,
      npc_name: npcName,
      created_at: r.created_at as string,
      responder_name: isNpc
        ? (npcName ? NPC_DISPLAY[npcName] ?? npcName : "NPC")
        : (profile?.display_name ?? profile?.username ?? "익명"),
      agent_name: isNpc ? "" : (agentRow?.name as string ?? "Unknown"),
      agent: agentRow ? dbToAgent(agentRow) : null,
    };
  });

  // Fetch user's agents for response modal
  const { data: myAgents } = await supabase
    .from("agents")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("name");

  const emotionTags = post.emotion_tags.map((tag) => ({
    key: tag,
    ...getEmotionLabel(tag),
  }));

  const isAuthor = post.author_id === user.id;
  const isOpen = post.status === "open";
  const hasResponded = responses.some((r) => r.responder_id === user.id);

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Back */}
        <a href="/counseling" className="text-sm text-text-muted hover:text-text">
          &larr; 게시판으로
        </a>

        {/* Crisis Banner */}
        {post.is_crisis && <div className="mt-4"><CrisisBanner /></div>}

        {/* Post Content */}
        <div className="mt-4 rounded-xl border border-border bg-surface p-6">
          {/* Status + Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isOpen ? "bg-accent/15 text-accent" : "bg-success/15 text-success"
              }`}
            >
              {isOpen ? "진행중" : "해결됨"}
            </span>
            {emotionTags.map((tag) => (
              <span
                key={tag.key}
                className="rounded-full bg-bg px-2 py-0.5 text-xs text-text-muted"
              >
                {tag.emoji} {tag.ko}
              </span>
            ))}
          </div>

          {/* Organized Content */}
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text">
            {post.organized_content}
          </div>

          {/* Meta */}
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-text-muted">
            <span>{post.author_name}의 {post.agent_name}</span>
            <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
            <span>응답 {post.response_count}개</span>
          </div>
        </div>

        {/* Interactive part (responses + actions) */}
        <PostDetail
          postId={post.id}
          postStatus={post.status}
          bestResponseId={post.best_response_id}
          isAuthor={isAuthor}
          hasResponded={hasResponded}
          initialResponses={responses}
          myAgents={(myAgents ?? []).map((a) => ({ id: a.id as string, name: a.name as string }))}
        />
      </div>
    </div>
  );
}
