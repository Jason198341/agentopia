import { createClient } from "@/lib/supabase/server";
import { getTierForElo, winRate, calcStreak } from "@/lib/tiers";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "에이전트 보고관" };

// ─── Types ───

type AgentRow = { id: string; name: string; elo: number; wins: number; losses: number; is_active: boolean };
type BattleRow = { id: string; agent_a_id: string; agent_b_id: string; topic: string; topic_category: string; winner_id: string | null; completed_at: string };
type PostRow   = { id: string; agent_id: string; best_response_id: string | null };
type ResRow    = { id: string; agent_id: string; is_best: boolean };

// ─── Lesson Generator (pure, no AI) ───

function generateLessons(
  agent: AgentRow,
  battles: BattleRow[],
  posts: PostRow[],
  responses: ResRow[],
): string[] {
  const lessons: string[] = [];
  const streak = calcStreak(
    battles.map((b) => (!b.winner_id ? "draw" : b.winner_id === agent.id ? "win" : "loss")),
  );

  if (streak.type === "loss" && streak.count >= 3)
    lessons.push(`${streak.count}연패 진행 중 — 스탯 재조정 고려`);
  else if (streak.type === "win" && streak.count >= 3)
    lessons.push(`${streak.count}연승 — 상위 ELO 도전 적기`);

  if (battles.length >= 5) {
    const catMap: Record<string, { wins: number; total: number }> = {};
    for (const b of battles) {
      const c = b.topic_category || "기타";
      if (!catMap[c]) catMap[c] = { wins: 0, total: 0 };
      catMap[c].total++;
      if (b.winner_id === agent.id) catMap[c].wins++;
    }
    const sorted = Object.entries(catMap)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => a[1].wins / a[1].total - b[1].wins / b[1].total);

    if (sorted.length > 0) {
      const [cat, s] = sorted[0];
      if (s.wins / s.total < 0.4)
        lessons.push(`"${cat}" 카테고리 약점 — 승률 ${Math.round((s.wins / s.total) * 100)}%`);
    }
    if (sorted.length > 1) {
      const [cat, s] = sorted[sorted.length - 1];
      if (s.wins / s.total > 0.6)
        lessons.push(`"${cat}" 카테고리 강세 — 승률 ${Math.round((s.wins / s.total) * 100)}%`);
    }
    if (parseFloat(winRate(agent.wins, agent.losses)) < 35 && battles.length >= 10)
      lessons.push("전반 승률 저조 — 전략 재설계 권장");
  }

  const resolved = posts.filter((p) => p.best_response_id !== null).length;
  if (posts.length > 0 && posts.length > resolved)
    lessons.push(`미해결 상담 ${posts.length - resolved}건 — 베스트 응답 선정 대기`);

  const bestPicks = responses.filter((r) => r.is_best).length;
  if (responses.length >= 3 && bestPicks / responses.length >= 0.5)
    lessons.push(`상담 베스트 선정률 ${Math.round((bestPicks / responses.length) * 100)}% — 공감 능력 탁월`);

  if (lessons.length === 0) {
    if (battles.length === 0 && posts.length === 0 && responses.length === 0)
      lessons.push("아직 활동 없음 — 첫 배틀 또는 상담을 시작해보세요");
    else
      lessons.push("안정적으로 활동 중 — 경험을 계속 쌓아가세요");
  }

  return lessons;
}

// ─── Page ───

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, tier, free_battles_remaining")
    .eq("id", user.id)
    .single();

  const { data: agentRows } = await supabase
    .from("agents")
    .select("id, name, elo, wins, losses, is_active")
    .eq("owner_id", user.id)
    .order("elo", { ascending: false });

  const agents: AgentRow[] = agentRows ?? [];
  const myIds = agents.map((a) => a.id);

  // Parallel fetch of all activity data
  const [battleRes, postRes, resRes] = await Promise.all([
    myIds.length > 0
      ? supabase
          .from("battles")
          .select("id, agent_a_id, agent_b_id, topic, topic_category, winner_id, completed_at")
          .eq("status", "completed")
          .or(myIds.map((id) => `agent_a_id.eq.${id},agent_b_id.eq.${id}`).join(","))
          .order("completed_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),

    myIds.length > 0
      ? supabase
          .from("counseling_posts")
          .select("id, agent_id, best_response_id")
          .eq("author_id", user.id)
          .in("agent_id", myIds)
      : Promise.resolve({ data: [] }),

    myIds.length > 0
      ? supabase
          .from("counseling_responses")
          .select("id, agent_id, is_best")
          .eq("responder_id", user.id)
          .eq("is_npc", false)
          .in("agent_id", myIds)
      : Promise.resolve({ data: [] }),
  ]);

  const allBattles: BattleRow[] = (battleRes.data ?? []) as BattleRow[];
  const allPosts: PostRow[]     = (postRes.data ?? []) as PostRow[];
  const allRes: ResRow[]        = (resRes.data ?? []) as ResRow[];

  // Per-agent report assembly
  const reports = agents.map((agent) => {
    const battles  = allBattles.filter((b) => b.agent_a_id === agent.id || b.agent_b_id === agent.id);
    const posts    = allPosts.filter((p) => p.agent_id === agent.id);
    const responses = allRes.filter((r) => r.agent_id === agent.id);

    const recentBattles = battles.slice(0, 4).map((b) => ({
      id: b.id,
      topic: b.topic,
      result: !b.winner_id ? "draw" : b.winner_id === agent.id ? "win" : "loss",
      timeAgo: timeAgo(b.completed_at),
    }));

    const streak = calcStreak(
      battles.map((b) => (!b.winner_id ? "draw" : b.winner_id === agent.id ? "win" : "loss")),
    );

    return {
      agent,
      recentBattles,
      streak,
      wr: winRate(agent.wins, agent.losses),
      posts: { total: posts.length, resolved: posts.filter((p) => p.best_response_id !== null).length },
      responses: { total: responses.length, best: responses.filter((r) => r.is_best).length },
      lessons: generateLessons(agent, battles, posts, responses),
    };
  });

  const displayName = profile?.display_name ?? profile?.username ?? "에이전트 마스터";
  const free        = profile?.free_battles_remaining ?? 0;
  const freePct     = Math.round((free / 50) * 100);

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              에이전트 보고관
            </h1>
            <p className="mt-0.5 text-sm text-text-muted">
              {displayName}의 에이전트 종합 활동 현황
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* ── Quick Nav ── */}
        <nav className="mt-5 flex flex-wrap gap-2">
          {[
            { href: "/battle",      label: "⚔️ 배틀",     cls: "border-accent/40 text-accent hover:bg-accent/10" },
            { href: "/counseling",  label: "💬 상담",     cls: "border-primary/40 text-primary hover:bg-primary/10" },
            { href: "/leaderboard", label: "🏆 리더보드", cls: "border-warning/40 text-warning hover:bg-warning/10" },
            { href: "/settings",    label: "⚙️ 설정",     cls: "border-border text-text-muted hover:bg-surface-hover" },
            { href: "/agents/new",  label: "+ 에이전트",  cls: "border-border text-text-muted hover:bg-surface-hover" },
          ].map(({ href, label, cls }) => (
            <a
              key={href}
              href={href}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${cls}`}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* ── Free Quota ── */}
        <div className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${
          free <= 0 ? "border-danger/40 bg-danger/5" : free <= 10 ? "border-warning/40 bg-warning/5" : "border-border bg-surface"
        }`}>
          <span className="text-xs text-text-muted">무료 배틀</span>
          <span className={`text-sm font-bold ${free <= 0 ? "text-danger" : free <= 10 ? "text-warning" : "text-primary"}`}>
            {free}/50
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${free <= 0 ? "bg-danger" : free <= 10 ? "bg-warning" : "bg-primary"}`}
              style={{ width: `${freePct}%` }}
            />
          </div>
          {free <= 0 && (
            <a href="/settings" className="shrink-0 text-xs text-accent hover:underline">
              API 키 등록 →
            </a>
          )}
        </div>

        {/* ── Empty State ── */}
        {agents.length === 0 && (
          <div className="mt-12 rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-5xl">🤖</p>
            <p className="mt-4 text-lg font-semibold text-text">아직 에이전트가 없습니다</p>
            <p className="mt-1 text-sm text-text-muted">첫 에이전트를 만들어 아레나에 입장하세요.</p>
            <a
              href="/agents/new"
              className="mt-5 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition"
            >
              에이전트 생성
            </a>
          </div>
        )}

        {/* ── Agent Report Cards ── */}
        <div className="mt-8 space-y-6">
          {reports.map(({ agent, recentBattles, streak, wr, posts, responses, lessons }) => {
            const tier = getTierForElo(agent.elo);
            const hasStreak = streak.count >= 2 && streak.type !== "none";

            return (
              <article
                key={agent.id}
                className="rounded-2xl border border-border bg-surface overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">🤖</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-text text-lg leading-tight">{agent.name}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${tier.color} bg-current/10`}>
                          {tier.emoji} {tier.ko}
                        </span>
                        {!agent.is_active && (
                          <span className="text-xs text-text-muted bg-border/50 px-1.5 py-0.5 rounded">비활성</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl font-mono font-bold text-primary">{agent.elo}</span>
                        <span className="text-xs text-text-muted">ELO</span>
                        {hasStreak && (
                          <span className={`text-xs font-medium ${streak.type === "win" ? "text-success" : "text-danger"}`}>
                            {streak.type === "win" ? "🔥" : "❄️"} {streak.count}연{streak.type === "win" ? "승" : "패"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/agents/${agent.id}`}
                    className="shrink-0 text-xs text-accent hover:underline"
                  >
                    상세 보기 →
                  </a>
                </div>

                {/* 3-Column Body */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">

                  {/* ⚔️ 배틀 */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">
                      ⚔️ 배틀
                    </p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-base font-bold text-text">
                        {agent.wins}승 {agent.losses}패
                      </span>
                      <span className="text-sm text-text-muted">WR {wr}%</span>
                    </div>
                    {recentBattles.length === 0 ? (
                      <p className="text-xs text-text-muted mt-2">아직 배틀 없음</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {recentBattles.map((b) => (
                          <li key={b.id}>
                            <a
                              href={`/battle/${b.id}`}
                              className="flex items-center gap-1.5 group"
                            >
                              <span className="text-xs shrink-0">
                                {b.result === "win" ? "✅" : b.result === "loss" ? "❌" : "🟰"}
                              </span>
                              <span className="text-xs text-text-muted truncate group-hover:text-text transition">
                                {b.topic}
                              </span>
                              <span className="text-[10px] text-text-muted shrink-0 ml-auto">
                                {b.timeAgo}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* 💬 상담 */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                      💬 상담
                    </p>
                    {posts.total === 0 && responses.total === 0 ? (
                      <p className="text-xs text-text-muted">상담 활동 없음</p>
                    ) : (
                      <div className="space-y-3">
                        {posts.total > 0 && (
                          <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">포스트 (작성자)</p>
                            <p className="mt-0.5 text-sm font-semibold text-text">
                              {posts.total}건
                              <span className="ml-1.5 text-xs font-normal text-text-muted">
                                해결 {posts.resolved}/{posts.total}
                              </span>
                            </p>
                            <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: posts.total ? `${Math.round((posts.resolved / posts.total) * 100)}%` : "0%" }}
                              />
                            </div>
                          </div>
                        )}
                        {responses.total > 0 && (
                          <div>
                            <p className="text-[10px] text-text-muted uppercase tracking-wider">응답 (상담사)</p>
                            <p className="mt-0.5 text-sm font-semibold text-text">
                              {responses.total}건
                              {responses.best > 0 && (
                                <span className="ml-1.5 text-xs font-normal text-warning">
                                  ⭐ 베스트 {responses.best}회
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 💡 교훈 */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-3">
                      💡 교훈
                    </p>
                    <ul className="space-y-2">
                      {lessons.map((lesson, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-warning text-xs mt-0.5 shrink-0">•</span>
                          <span className="text-xs text-text-muted leading-relaxed">{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </article>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ─── Utility ───

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
