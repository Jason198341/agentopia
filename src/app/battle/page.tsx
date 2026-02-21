import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BattleLauncher } from "./battle-launcher";

export default async function BattlePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

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
          &larr; Dashboard
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">
          Battle <span className="text-primary">Arena</span>
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Select an agent and find an opponent for a 5-turn debate.
        </p>

        {!agents || agents.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-4xl">🤖</p>
            <p className="mt-3 text-text-muted">
              You need an agent to battle.{" "}
              <a href="/agents/new" className="text-primary hover:text-primary-hover">
                Create one first
              </a>
              .
            </p>
          </div>
        ) : (
          <BattleLauncher agents={agents} />
        )}
      </div>
    </div>
  );
}
