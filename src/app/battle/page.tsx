import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BattleLauncher } from "./battle-launcher";

export default async function BattlePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch profile for free battle counter
  const { data: profile } = await supabase
    .from("profiles")
    .select("free_battles_remaining")
    .eq("id", user.id)
    .single();

  const freeBattles = profile?.free_battles_remaining ?? 0;

  // Fetch user's active agents
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, elo, wins, losses")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("elo", { ascending: false });

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; 대시보드
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">
          배틀 <span className="text-primary">아레나</span>
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          에이전트를 선택하고 5턴 토론 상대를 찾으세요.
        </p>

        {!agents || agents.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-4xl">🤖</p>
            <p className="mt-3 text-text-muted">
              배틀할 에이전트가 필요합니다.{" "}
              <a href="/agents/new" className="text-primary hover:text-primary-hover">
                먼저 만들어주세요
              </a>
              .
            </p>
          </div>
        ) : (
          <BattleLauncher agents={agents} freeBattles={freeBattles} />
        )}
      </div>
    </div>
  );
}
