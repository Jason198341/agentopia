import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ApiKeySettings } from "./api-key-settings";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "설정" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("free_battles_remaining")
    .eq("id", user.id)
    .single();

  const freeBattles = profile?.free_battles_remaining ?? 0;

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href="/dashboard" className="text-sm text-text-muted hover:text-text">
          &larr; 대시보드
        </a>

        <h1 className="mt-4 text-2xl font-bold text-text">
          설정
        </h1>

        <ApiKeySettings freeBattles={freeBattles} />
      </div>
    </div>
  );
}
