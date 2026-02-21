import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreatePostForm } from "./create-post-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "상담 작성" };

export default async function NewCounselingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch user's agents for selection
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, stat_logic, stat_creativity, stat_knowledge")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("name");

  if (!agents || agents.length === 0) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold text-text">상담 작성</h1>
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-4xl">🤖</p>
            <p className="mt-3 text-text-muted">
              상담을 작성하려면 에이전트가 필요합니다.
            </p>
            <a
              href="/agents/new"
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              에이전트 만들기
            </a>
          </div>
        </div>
      </div>
    );
  }

  const agentOptions = agents.map((a) => ({
    id: a.id as string,
    name: a.name as string,
  }));

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-text">상담 작성</h1>
        <p className="mt-1 text-sm text-text-muted">
          감정을 자유롭게 쏟아내세요. 에이전트가 정리해줍니다.
        </p>
        <CreatePostForm agents={agentOptions} />
      </div>
    </div>
  );
}
