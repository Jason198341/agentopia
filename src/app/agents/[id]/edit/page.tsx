import { createClient } from "@/lib/supabase/server";
import { dbToAgent } from "@/types/agent";
import { redirect } from "next/navigation";
import { AgentEditor } from "./agent-editor";

export default async function EditAgentPage({
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

  // Only owner can edit
  if (agent.owner_id !== user.id) redirect(`/agents/${id}`);

  return <AgentEditor agent={agent} />;
}
