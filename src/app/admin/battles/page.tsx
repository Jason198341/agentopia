import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "배틀 통계 — 관리자" };

export default async function AdminBattlesPage() {
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

  // Fetch all completed battles
  const { data: battles } = await supabase
    .from("battles")
    .select("id, agent_a_id, agent_b_id, topic, topic_category, winner_id, score_a, score_b, model_tier, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(500);

  const all = battles ?? [];
  const total = all.length;

  // Model tier distribution
  const tierCounts: Record<string, number> = {};
  for (const b of all) {
    const tier = (b.model_tier as string) || "free";
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }

  // PRO vs CON win rate
  let proWins = 0;
  let conWins = 0;
  let draws = 0;
  for (const b of all) {
    if (!b.winner_id) draws++;
    else if (b.winner_id === b.agent_a_id) proWins++;
    else conWins++;
  }

  // Average scores
  let totalScoreA = 0;
  let totalScoreB = 0;
  let scored = 0;
  for (const b of all) {
    const sa = b.score_a as { total?: number } | null;
    const sb = b.score_b as { total?: number } | null;
    if (sa?.total != null && sb?.total != null) {
      totalScoreA += sa.total;
      totalScoreB += sb.total;
      scored++;
    }
  }
  const avgScoreA = scored > 0 ? (totalScoreA / scored).toFixed(1) : "—";
  const avgScoreB = scored > 0 ? (totalScoreB / scored).toFixed(1) : "—";

  // Top topics by frequency
  const topicFreq: Record<string, number> = {};
  for (const b of all) {
    topicFreq[b.topic] = (topicFreq[b.topic] || 0) + 1;
  }
  const topTopics = Object.entries(topicFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Category distribution
  const catFreq: Record<string, number> = {};
  for (const b of all) {
    const cat = (b.topic_category as string) || "unknown";
    catFreq[cat] = (catFreq[cat] || 0) + 1;
  }
  const topCategories = Object.entries(catFreq)
    .sort((a, b) => b[1] - a[1]);

  // Battles per day (last 14 days)
  const dailyCounts: Record<string, number> = {};
  for (const b of all) {
    if (!b.completed_at) continue;
    const date = (b.completed_at as string).slice(0, 10);
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  }
  const dailyData = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14);

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">배틀 통계</h1>
          <span className="rounded bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">
            ADMIN
          </span>
        </div>
        <a href="/admin" className="text-sm text-text-muted hover:text-text">
          &larr; 관리자 대시보드
        </a>

        {/* Summary Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="총 배틀" value={total} color="text-primary" />
          <Card label="PRO 승률" value={`${total > 0 ? Math.round((proWins / total) * 100) : 0}%`} color="text-success" />
          <Card label="CON 승률" value={`${total > 0 ? Math.round((conWins / total) * 100) : 0}%`} color="text-danger" />
          <Card label="무승부" value={draws} color="text-text-muted" />
        </div>

        {/* Average Scores */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-success">{avgScoreA}</p>
            <p className="text-xs text-text-muted">PRO 평균 점수</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-danger">{avgScoreB}</p>
            <p className="text-xs text-text-muted">CON 평균 점수</p>
          </div>
        </div>

        {/* Model Tier Distribution */}
        <section className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            모델 사용 분포
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(tierCounts).map(([tier, count]) => (
              <div key={tier} className="rounded-lg border border-border bg-surface px-3 py-2 text-center">
                <p className="text-lg font-bold text-accent">{count}</p>
                <p className="text-[10px] text-text-muted">{tier}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Battle Trend */}
        {dailyData.length >= 2 && (
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              일별 배틀 수 (최근 14일)
            </h2>
            <div className="mt-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-end gap-1" style={{ height: 80 }}>
                {dailyData.map(([date, count]) => {
                  const max = Math.max(...dailyData.map((d) => d[1]));
                  const h = (count / (max || 1)) * 100;
                  return (
                    <div key={date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[9px] font-mono text-text-muted">{count}</span>
                      <div
                        className="w-full rounded-t bg-primary"
                        style={{ height: `${h}%`, minHeight: 2 }}
                      />
                      <span className="text-[8px] text-text-muted">{date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Category Distribution */}
        <section className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            카테고리별 배틀 수
          </h2>
          <div className="mt-3 space-y-1.5">
            {topCategories.map(([cat, count]) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-text-muted">{cat}</span>
                  <div className="h-2 flex-1 rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-text-muted">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top Topics */}
        <section className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
            인기 주제 TOP 10
          </h2>
          <div className="mt-3 space-y-1">
            {topTopics.map(([topic, count], i) => (
              <div key={topic} className="flex items-center gap-2 rounded-lg bg-surface/50 px-3 py-2">
                <span className="w-6 text-center font-mono text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm text-text">{topic}</span>
                <span className="font-mono text-xs text-text-muted">{count}회</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
