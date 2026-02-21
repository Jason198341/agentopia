import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { post_id, response_id } = body as { post_id?: string; response_id?: string };

  if (!post_id || !response_id) {
    return NextResponse.json({ error: "post_id and response_id required" }, { status: 400 });
  }

  // 3. Verify post ownership + open status
  const { data: post, error: postErr } = await supabase
    .from("counseling_posts")
    .select("id, author_id, status")
    .eq("id", post_id)
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "Only the author can select best" }, { status: 403 });
  }
  if (post.status !== "open") {
    return NextResponse.json({ error: "Post already resolved" }, { status: 409 });
  }

  // 4. Verify response exists and belongs to this post
  const { data: response, error: resErr } = await supabase
    .from("counseling_responses")
    .select("id, post_id")
    .eq("id", response_id)
    .eq("post_id", post_id)
    .single();

  if (resErr || !response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 });
  }

  // 5. Update post → resolved + best_response_id
  await admin
    .from("counseling_posts")
    .update({
      status: "resolved",
      best_response_id: response_id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", post_id);

  // 6. Mark response as best
  await admin
    .from("counseling_responses")
    .update({ is_best: true })
    .eq("id", response_id);

  return NextResponse.json({ success: true });
}
