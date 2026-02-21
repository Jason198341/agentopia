import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeaderboardView } from "./leaderboard-view";

export default async function LeaderboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch top 50 agents by ELO, join with profiles for owner name
  const { data: agentRows } = await supabase
    .from("agents")
    .select("id, name, elo, wins, losses, owner_id, specialties, is_active")
    .eq("is_active", true)
    .order("elo", { ascending: false })
    .limit(50);

  const agents = agentRows ?? [];

  // Get unique owner IDs and fetch their display names
  const ownerIds = [...new Set(agents.map((a) => a.owner_id))];
  let ownerNames: Record<string, string> = {};

  if (ownerIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ownerIds);

    ownerNames = Object.fromEntries(
      (profileRows ?? []).map((p) => [p.id, p.display_name || p.username || "Anonymous"]),
    );
  }

  const leaderboard = agents.map((a, index) => ({
    rank: index + 1,
    id: a.id,
    name: a.name,
    elo: a.elo,
    wins: a.wins,
    losses: a.losses,
    ownerName: ownerNames[a.owner_id] ?? "Unknown",
    isOwn: a.owner_id === user.id,
    isNpc: a.owner_id === "00000000-0000-0000-0000-000000000000",
  }));

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <LeaderboardView entries={leaderboard} />
      </div>
    </div>
  );
}
