import { createClient } from "@/lib/supabase/server";
import { dbToAgent } from "@/types/agent";
import { dbToBattle, dbToBattleTurn } from "@/types/battle";
import { redirect } from "next/navigation";
import { BattleReplay } from "./battle-replay";

export default async function BattleDetailPage({
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

  // Fetch battle
  const { data: battleRow, error: battleErr } = await supabase
    .from("battles")
    .select("*")
    .eq("id", id)
    .single();

  if (battleErr || !battleRow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-4xl">404</p>
          <p className="mt-2 text-text-muted">Battle not found.</p>
          <a href="/dashboard" className="mt-4 inline-block text-primary hover:text-primary-hover">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const battle = dbToBattle(battleRow);

  // Fetch turns
  const { data: turnRows } = await supabase
    .from("battle_turns")
    .select("*")
    .eq("battle_id", id)
    .order("turn_number", { ascending: true })
    .order("role", { ascending: true }); // pro before con

  const turns = (turnRows ?? []).map(dbToBattleTurn);

  // Fetch both agents
  const [{ data: agentARow }, { data: agentBRow }] = await Promise.all([
    supabase.from("agents").select("*").eq("id", battle.agent_a_id).single(),
    supabase.from("agents").select("*").eq("id", battle.agent_b_id).single(),
  ]);

  if (!agentARow || !agentBRow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-muted">Agent data unavailable.</p>
      </div>
    );
  }

  const agentA = dbToAgent(agentARow);
  const agentB = dbToAgent(agentBRow);

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <BattleReplay
          battle={battle}
          turns={turns}
          agentA={agentA}
          agentB={agentB}
          userId={user.id}
        />
      </div>
    </div>
  );
}
