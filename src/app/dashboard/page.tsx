import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, tier")
    .eq("id", user.id)
    .single();

  // Fetch user's agents
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, elo, wins, losses, is_active")
    .eq("owner_id", user.id)
    .order("elo", { ascending: false });

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">
              Agent<span className="text-primary">opia</span>
            </h1>
            <p className="text-sm text-text-muted">
              Welcome, {profile?.display_name ?? profile?.username ?? "Agent Master"}
              {profile?.tier === "premium" && (
                <span className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                  PRO
                </span>
              )}
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Agent List */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">My Agents</h2>
            <a
              href="/agents/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
            >
              + Create Agent
            </a>
          </div>

          {!agents || agents.length === 0 ? (
            <div className="mt-6 rounded-xl border border-border bg-surface p-8 text-center">
              <p className="text-4xl">🤖</p>
              <p className="mt-3 text-text-muted">
                No agents yet. Create your first agent to enter the arena.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {agents.map((agent) => (
                <a
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-hover"
                >
                  <div>
                    <p className="font-medium text-text">{agent.name}</p>
                    <p className="text-sm text-text-muted">
                      {agent.wins}W {agent.losses}L
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {agent.elo}
                    </p>
                    <p className="text-xs text-text-muted">ELO</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Battle CTA — shown when user has agents */}
        {agents && agents.length > 0 && (
          <section className="mt-8">
            <a
              href="/battle"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-dim py-4 text-lg font-bold text-accent transition hover:bg-accent/20"
            >
              Find Battle
            </a>
          </section>
        )}
      </div>
    </div>
  );
}
