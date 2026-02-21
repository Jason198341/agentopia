"use client";

import { useEffect, useState } from "react";

interface Stats {
  total_posts: number;
  missing_npc_count: number;
  missing_posts: { id: string; preview: string; created_at: string }[];
}

export default function AdminCounselingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function fetchStats() {
    setLoading(true);
    const res = await fetch("/api/admin/counseling");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, []);

  async function handleBackfill() {
    if (!confirm(`NPC 미응답 글 ${stats?.missing_npc_count}개에 자동 응답을 생성합니다. 계속하시겠습니까?`)) return;
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/admin/counseling", { method: "POST" });
    const data = await res.json();
    setResult(data.message ?? "완료");
    setRunning(false);
    await fetchStats(); // 다시 조회
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a href="/admin" className="text-sm text-text-muted hover:text-text">
          &larr; 관리자
        </a>

        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">상담 NPC 관리</h1>
          <span className="rounded bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">ADMIN</span>
        </div>
        <p className="mt-1 text-sm text-text-muted">
          기존 상담 글 중 NPC 응답이 없는 글에 자동 응답을 일괄 생성합니다.
        </p>

        {loading ? (
          <div className="mt-8 text-center text-text-muted">로딩 중...</div>
        ) : stats ? (
          <div className="mt-6 space-y-4">
            {/* 현황 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-primary">{stats.total_posts}</p>
                <p className="text-xs text-text-muted">전체 상담글</p>
              </div>
              <div className={`rounded-xl border p-4 text-center ${
                stats.missing_npc_count > 0
                  ? "border-warning/40 bg-warning/5"
                  : "border-success/40 bg-success/5"
              }`}>
                <p className={`text-2xl font-bold ${stats.missing_npc_count > 0 ? "text-warning" : "text-success"}`}>
                  {stats.missing_npc_count}
                </p>
                <p className="text-xs text-text-muted">NPC 미응답 글</p>
              </div>
            </div>

            {/* 미응답 글 목록 */}
            {stats.missing_npc_count > 0 && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-3">
                  NPC 응답 없는 글 ({stats.missing_npc_count}개)
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {stats.missing_posts.map((p) => (
                    <div key={p.id} className="rounded-lg bg-surface/50 px-3 py-2">
                      <p className="text-xs text-text">{p.preview}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {new Date(p.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 결과 메시지 */}
            {result && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm text-success">
                ✓ {result}
              </div>
            )}

            {/* 일괄 처리 버튼 */}
            <button
              onClick={handleBackfill}
              disabled={running || stats.missing_npc_count === 0}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-accent/80 disabled:opacity-50"
            >
              {running
                ? "NPC 응답 생성 중... (시간이 걸릴 수 있습니다)"
                : stats.missing_npc_count === 0
                  ? "✓ 모든 글에 NPC 응답 있음"
                  : `🤖 NPC 응답 일괄 생성 (${stats.missing_npc_count}개)`}
            </button>

            <p className="text-xs text-text-muted text-center">
              NPC: 🤗 Dr. Warm · 💪 Coach Direct · 🧘 Sage Listener<br/>
              각 글당 3개 응답 생성 · Fireworks AI 사용
            </p>
          </div>
        ) : (
          <p className="mt-8 text-center text-danger">통계 로드 실패</p>
        )}
      </div>
    </div>
  );
}
