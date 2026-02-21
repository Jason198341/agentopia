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

  const myAgentIds = (agents ?? []).map((a) => a.id);

  // Fetch recent battles (global, last 15)
  const { data: recentBattleRows } = await supabase
    .from("battles")
    .select("id, agent_a_id, agent_b_id, topic, topic_category, winner_id, score_a, score_b, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(15);

  const recentBattles = recentBattleRows ?? [];

  // Fetch agent names for the feed
  const feedAgentIds = [
    ...new Set(recentBattles.flatMap((b) => [b.agent_a_id, b.agent_b_id])),
  ];
  let feedAgentNames: Record<string, string> = {};
  if (feedAgentIds.length > 0) {
    const { data: feedAgentRows } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", feedAgentIds);
    feedAgentNames = Object.fromEntries(
      (feedAgentRows ?? []).map((a) => [a.id, a.name]),
    );
  }

  const battleFeed = recentBattles.map((b) => {
    const nameA = feedAgentNames[b.agent_a_id] ?? "Unknown";
    const nameB = feedAgentNames[b.agent_b_id] ?? "Unknown";
    const winnerName = b.winner_id
      ? b.winner_id === b.agent_a_id ? nameA : nameB
      : null;
    const isMyBattle = myAgentIds.includes(b.agent_a_id) || myAgentIds.includes(b.agent_b_id);
    const timeAgo = b.completed_at ? getTimeAgo(b.completed_at) : "";
    return {
      id: b.id,
      nameA,
      nameB,
      topic: b.topic,
      category: b.topic_category,
      winnerName,
      scoreA: (b.score_a as { total?: number })?.total ?? 0,
      scoreB: (b.score_b as { total?: number })?.total ?? 0,
      isMyBattle,
      timeAgo,
    };
  });

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">
              Welcome, {profile?.display_name ?? profile?.username ?? "Agent Master"}
            </h1>
            <p className="text-sm text-text-muted">
              {profile?.tier === "premium" ? (
                <span className="rounded bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                  PRO
                </span>
              ) : (
                "Free Tier"
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

        {/* Quick Actions */}
        {agents && agents.length > 0 && (
          <section className="mt-8 flex gap-3">
            <a
              href="/battle"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-dim py-3 text-sm font-bold text-accent transition hover:bg-accent/20"
            >
              Find Battle
            </a>
            <a
              href="/leaderboard"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/5 py-3 text-sm font-bold text-warning transition hover:bg-warning/10"
            >
              Leaderboard
            </a>
          </section>
        )}

        {/* Recent Battles Feed */}
        {battleFeed.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-text">Recent Battles</h2>
            <div className="mt-3 space-y-2">
              {battleFeed.map((b) => (
                <a
                  key={b.id}
                  href={`/battle/${b.id}`}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition hover:bg-surface-hover ${
                    b.isMyBattle
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {b.nameA} <span className="text-text-muted">vs</span> {b.nameB}
                    </p>
                    <p className="truncate text-xs text-text-muted">{b.topic}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-text">
                      {b.scoreA}–{b.scoreB}
                    </p>
                    <p className="text-[10px] text-text-muted">{b.timeAgo}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
