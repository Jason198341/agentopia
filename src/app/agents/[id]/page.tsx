import { createClient } from "@/lib/supabase/server";
import { dbToAgent } from "@/types/agent";
import { redirect } from "next/navigation";
import { AgentDetail } from "./agent-detail";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) redirect("/dashboard");

  const agent = dbToAgent(data);
  const isOwner = agent.owner_id === user.id;

  // Fetch recent battles (where this agent participated)
  const { data: battleRows } = await supabase
    .from("battles")
    .select("id, agent_a_id, agent_b_id, topic, topic_category, status, winner_id, score_a, score_b, elo_change_a, elo_change_b, completed_at")
    .or(`agent_a_id.eq.${id},agent_b_id.eq.${id}`)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(20);

  // Fetch ELO history for the graph (oldest first for charting)
  const { data: eloRows } = await supabase
    .from("elo_history")
    .select("elo_before, elo_after, change, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  // Fetch opponent names for display
  const battles = battleRows ?? [];
  const opponentIds = battles.map((b) =>
    b.agent_a_id === id ? b.agent_b_id : b.agent_a_id,
  );
  const uniqueOpponentIds = [...new Set(opponentIds)];

  let opponentNames: Record<string, string> = {};
  if (uniqueOpponentIds.length > 0) {
    const { data: opponentRows } = await supabase
      .from("agents")
      .select("id, name")
      .in("id", uniqueOpponentIds);

    opponentNames = Object.fromEntries(
      (opponentRows ?? []).map((o) => [o.id, o.name]),
    );
  }

  const battleHistory = battles.map((b) => {
    const isAgentA = b.agent_a_id === id;
    const opponentId = isAgentA ? b.agent_b_id : b.agent_a_id;
    const won = b.winner_id === id;
    const draw = b.winner_id === null;
    const myScore = isAgentA ? b.score_a : b.score_b;
    const theirScore = isAgentA ? b.score_b : b.score_a;
    const eloChange = isAgentA ? b.elo_change_a : b.elo_change_b;

    return {
      id: b.id,
      opponent: opponentNames[opponentId] ?? "Unknown",
      topic: b.topic,
      category: b.topic_category,
      result: draw ? ("draw" as const) : won ? ("win" as const) : ("loss" as const),
      myScore: myScore?.total ?? 0,
      theirScore: theirScore?.total ?? 0,
      eloChange: eloChange ?? 0,
      date: b.completed_at,
      // Per-criteria scores for trends
      criteria: myScore
        ? {
            logic: myScore.logic ?? 0,
            rebuttal: myScore.rebuttal ?? 0,
            consistency: myScore.consistency ?? 0,
            persuasion: myScore.persuasion ?? 0,
            expression: myScore.expression ?? 0,
            factual: myScore.factual ?? 0,
          }
        : null,
    };
  });

  // Build ELO history points for the chart
  const eloHistory = (eloRows ?? []).map((r) => ({
    elo: r.elo_after as number,
    change: r.change as number,
    date: r.created_at as string,
  }));

  return (
    <AgentDetail
      agent={agent}
      isOwner={isOwner}
      battleHistory={battleHistory}
      eloHistory={eloHistory}
    />
  );
}
