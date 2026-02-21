import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbToAgent } from "@/types/agent";
import { detectCrisis } from "@/types/counseling";
import { buildOrganizeSystemPrompt } from "@/data/prompts/counseling";
import { fireworksCompletion } from "@/lib/ai";
import { triggerNpcResponses } from "@/lib/counseling-npc";
import { NextResponse } from "next/server";

// GET: List counseling posts (paginated, filterable)
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all"; // all | open | resolved | mine
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("counseling_posts")
    .select("*, profiles!counseling_posts_author_id_fkey(display_name, username), agents!counseling_posts_agent_id_fkey(name)", { count: "exact" });

  if (filter === "open") query = query.eq("status", "open");
  else if (filter === "resolved") query = query.eq("status", "resolved");
  else if (filter === "mine") query = query.eq("author_id", user.id);

  const { data: rows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (rows ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as Record<string, string> | null;
    const agent = row.agents as Record<string, string> | null;
    return {
      id: row.id,
      author_id: row.author_id,
      agent_id: row.agent_id,
      organized_content: row.organized_content,
      emotion_tags: row.emotion_tags,
      status: row.status,
      best_response_id: row.best_response_id,
      is_crisis: row.is_crisis,
      response_count: row.response_count,
      created_at: row.created_at,
      resolved_at: row.resolved_at,
      author_name: profile?.display_name ?? profile?.username ?? "익명",
      agent_name: agent?.name ?? "Unknown",
    };
  });

  return NextResponse.json({ posts, total: count ?? 0, page });
}

// POST: Create a new counseling post
export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Parse body
  const body = await request.json();
  const { raw_input, agent_id } = body as { raw_input?: string; agent_id?: string };

  if (!raw_input || raw_input.trim().length < 10) {
    return NextResponse.json({ error: "최소 10자 이상 입력해주세요." }, { status: 400 });
  }
  if (raw_input.length > 2000) {
    return NextResponse.json({ error: "2000자를 초과할 수 없습니다." }, { status: 400 });
  }
  if (!agent_id) {
    return NextResponse.json({ error: "agent_id required" }, { status: 400 });
  }

  // 3. Reset quota if 24h passed, then check
  await admin.rpc("reset_counseling_quota_if_needed", { p_user_id: user.id });

  const { data: profile } = await supabase
    .from("profiles")
    .select("free_counseling_posts_remaining")
    .eq("id", user.id)
    .single();

  const remaining = profile?.free_counseling_posts_remaining ?? 0;
  if (remaining <= 0) {
    return NextResponse.json(
      { error: "COUNSELING_POSTS_EXHAUSTED", remaining: 0 },
      { status: 403 },
    );
  }

  // 4. Check unresolved posts — must pick best before new post
  const { count: unresolvedCount } = await supabase
    .from("counseling_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id)
    .eq("status", "open");

  if ((unresolvedCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "UNRESOLVED_POST_EXISTS" },
      { status: 409 },
    );
  }

  // 5. Verify agent ownership
  const { data: agentRow, error: agentErr } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agent_id)
    .eq("owner_id", user.id)
    .single();

  if (agentErr || !agentRow) {
    return NextResponse.json({ error: "Agent not found or not owned" }, { status: 404 });
  }
  const agent = dbToAgent(agentRow);

  // 6. Crisis detection
  const isCrisis = detectCrisis(raw_input);

  // 7. AI organize (synchronous — 1 call)
  let organized = raw_input;
  let emotionTags: string[] = [];
  try {
    const systemPrompt = buildOrganizeSystemPrompt(agent);
    const result = await fireworksCompletion({
      systemPrompt,
      userPrompt: raw_input,
      maxTokens: 800,
      temperature: 0.5,
    });

    const parsed = JSON.parse(result.content);
    organized = parsed.organized ?? raw_input;
    emotionTags = Array.isArray(parsed.emotion_tags) ? parsed.emotion_tags : [];
  } catch {
    // Fallback: use raw input as-is, no tags
    organized = raw_input;
    emotionTags = [];
  }

  // 8. Insert post via admin (bypasses RLS for setting all fields)
  const { data: post, error: postErr } = await admin
    .from("counseling_posts")
    .insert({
      author_id: user.id,
      agent_id,
      raw_input: raw_input.trim(),
      organized_content: organized,
      emotion_tags: emotionTags,
      status: "open",
      is_crisis: isCrisis,
    })
    .select("id")
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  // 9. Decrement quota
  await admin
    .from("profiles")
    .update({ free_counseling_posts_remaining: Math.max(0, remaining - 1) })
    .eq("id", user.id);

  // 10. Fire NPC auto-responses (non-blocking — don't await)
  void triggerNpcResponses(post.id, organized, emotionTags);

  return NextResponse.json({
    post_id: post.id,
    organized_content: organized,
    emotion_tags: emotionTags,
    is_crisis: isCrisis,
    free_counseling_posts_remaining: remaining - 1,
  });
}
