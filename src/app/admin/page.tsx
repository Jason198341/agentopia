import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Double-check role (middleware already guards, but defense in depth)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch basic stats
  const { count: totalAgents } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true });

  const { count: totalBattles } = await supabase
    .from("battles")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">관리자 대시보드</h1>
          <span className="rounded bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">
            ADMIN
          </span>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          플랫폼 현황 및 콘텐츠 관리
        </p>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalUsers ?? 0}</p>
            <p className="text-xs text-text-muted">총 유저</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-accent">{totalAgents ?? 0}</p>
            <p className="text-xs text-text-muted">총 에이전트</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-success">{totalBattles ?? 0}</p>
            <p className="text-xs text-text-muted">완료된 배틀</p>
          </div>
        </div>

        {/* Admin Sections — placeholders for future features */}
        <div className="mt-8 space-y-3">
          <a
            href="/admin/topics"
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-hover"
          >
            <div>
              <p className="font-medium text-text">주제 관리</p>
              <p className="text-sm text-text-muted">토론 주제 CRUD · AI 추천 · 카테고리</p>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </a>
          <a
            href="/admin/battles"
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-hover"
          >
            <div>
              <p className="font-medium text-text">배틀 통계</p>
              <p className="text-sm text-text-muted">주제별 PRO/CON 승률 · 모델 분포 · 일별 트렌드</p>
            </div>
            <span className="text-text-muted">&rarr;</span>
          </a>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface/50 p-4 opacity-50">
            <div>
              <p className="font-medium text-text-muted">유저 관리</p>
              <p className="text-sm text-text-muted">계정 조회 · 티어 변경 · 제재</p>
            </div>
            <span className="text-xs text-text-muted">준비 중</span>
          </div>
        </div>
      </div>
    </div>
  );
}
