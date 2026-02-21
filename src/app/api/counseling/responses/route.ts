import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbToAgent } from "@/types/agent";
import { buildCounselingResponseSystemPrompt } from "@/data/prompts/counseling";
import { fireworksCompletion } from "@/lib/ai";
import { NextResponse } from "next/server";

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
  const { post_id, agent_id } = body as { post_id?: string; agent_id?: string };

  if (!post_id || !agent_id) {
    return NextResponse.json({ error: "post_id and agent_id required" }, { status: 400 });
  }

  // 3. Reset quota if 24h passed, then check
  await admin.rpc("reset_counseling_quota_if_needed", { p_user_id: user.id });

  const { data: profile } = await supabase
    .from("profiles")
    .select("free_counseling_responses_remaining")
    .eq("id", user.id)
    .single();

  const remaining = profile?.free_counseling_responses_remaining ?? 0;
  if (remaining <= 0) {
    return NextResponse.json(
      { error: "COUNSELING_RESPONSES_EXHAUSTED", remaining: 0 },
      { status: 403 },
    );
  }

  // 4. Fetch post — must be open, can't respond to own
  const { data: post, error: postErr } = await supabase
    .from("counseling_posts")
    .select("id, author_id, organized_content, emotion_tags, status")
    .eq("id", post_id)
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.status !== "open") {
    return NextResponse.json({ error: "POST_RESOLVED" }, { status: 409 });
  }
  if (post.author_id === user.id) {
    return NextResponse.json({ error: "CANNOT_RESPOND_OWN" }, { status: 403 });
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

  // 6. AI generate counseling response (synchronous — 1 call)
  let content = "";
  try {
    const systemPrompt = buildCounselingResponseSystemPrompt(
      agent,
      post.organized_content as string,
      (post.emotion_tags as string[]) ?? [],
    );
    const result = await fireworksCompletion({
      systemPrompt,
      userPrompt: "Please provide your counseling advice now.",
      maxTokens: 400,
      temperature: 0.7,
    });
    content = result.content;
  } catch {
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }

  // 7. Insert response via admin
  const { data: response, error: resErr } = await admin
    .from("counseling_responses")
    .insert({
      post_id,
      responder_id: user.id,
      agent_id,
      content,
    })
    .select("id")
    .single();

  if (resErr) {
    // UNIQUE violation → already responded
    if (resErr.code === "23505") {
      return NextResponse.json({ error: "ALREADY_RESPONDED" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create response" }, { status: 500 });
  }

  // 8. Increment response_count via fetch + update
  const { data: freshPost } = await admin
    .from("counseling_posts")
    .select("response_count")
    .eq("id", post_id)
    .single();

  await admin
    .from("counseling_posts")
    .update({ response_count: ((freshPost?.response_count as number) ?? 0) + 1 })
    .eq("id", post_id);

  // 9. Decrement quota
  await admin
    .from("profiles")
    .update({ free_counseling_responses_remaining: Math.max(0, remaining - 1) })
    .eq("id", user.id);

  return NextResponse.json({
    response_id: response.id,
    content,
    free_counseling_responses_remaining: remaining - 1,
  });
}
