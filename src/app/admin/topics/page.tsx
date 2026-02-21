import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopicsManager } from "./topics-manager";

export default async function AdminTopicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch all topics (including inactive)
  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .order("difficulty")
    .order("category")
    .order("use_count", { ascending: true });

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <TopicsManager initialTopics={topics ?? []} />
      </div>
    </div>
  );
}
