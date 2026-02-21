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

  return <AgentDetail agent={agent} isOwner={isOwner} />;
}
