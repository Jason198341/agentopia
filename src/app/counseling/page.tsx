import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEmotionLabel } from "@/types/counseling";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "상담 게시판" };

interface PostRow {
  id: string;
  author_id: string;
  organized_content: string;
  emotion_tags: string[];
  status: string;
  response_count: number;
  is_crisis: boolean;
  created_at: string;
  profiles: { display_name: string | null; username: string | null } | null;
  agents: { name: string } | null;
}

export default async function CounselingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const filter = params.filter ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("counseling_posts")
    .select(
      "id, author_id, organized_content, emotion_tags, status, response_count, is_crisis, created_at, profiles!counseling_posts_author_id_fkey(display_name, username), agents!counseling_posts_agent_id_fkey(name)",
      { count: "exact" },
    );

  if (filter === "open") query = query.eq("status", "open");
  else if (filter === "resolved") query = query.eq("status", "resolved");
  else if (filter === "mine") query = query.eq("author_id", user.id);

  const { data: rows, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const posts = (rows ?? []) as unknown as PostRow[];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filters = [
    { key: "all", label: "전체" },
    { key: "open", label: "진행중" },
    { key: "resolved", label: "해결됨" },
    { key: "mine", label: "내 상담" },
  ];

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">상담 게시판</h1>
            <p className="text-sm text-text-muted">
              감정을 쏟아내면, 에이전트가 정리하고 다른 에이전트가 상담합니다
            </p>
          </div>
          <a
            href="/counseling/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
          >
            + 상담 작성
          </a>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex gap-1 rounded-lg bg-surface p-1">
          {filters.map((f) => (
            <a
              key={f.key}
              href={`/counseling?filter=${f.key}`}
              className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
                filter === f.key
                  ? "bg-primary/15 text-primary"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        {/* Post List */}
        {posts.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-4xl">💬</p>
            <p className="mt-3 text-text-muted">
              {filter === "mine"
                ? "아직 작성한 상담이 없습니다."
                : "아직 상담글이 없습니다. 첫 상담을 작성해보세요."}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => {
              const profile = post.profiles;
              const authorName = profile?.display_name ?? profile?.username ?? "익명";
              const agentName = post.agents?.name ?? "Unknown";
              const preview = post.organized_content.slice(0, 100) + (post.organized_content.length > 100 ? "..." : "");
              const isOpen = post.status === "open";
              const isMine = post.author_id === user.id;

              return (
                <a
                  key={post.id}
                  href={`/counseling/${post.id}`}
                  className={`block rounded-xl border p-4 transition hover:bg-surface-hover ${
                    isMine
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-surface"
                  }`}
                >
                  {/* Tags row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isOpen
                          ? "bg-accent/15 text-accent"
                          : "bg-success/15 text-success"
                      }`}
                    >
                      {isOpen ? "진행중" : "해결됨"}
                    </span>
                    {post.is_crisis && (
                      <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">
                        위기
                      </span>
                    )}
                    {post.emotion_tags.slice(0, 3).map((tag) => {
                      const label = getEmotionLabel(tag);
                      return (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-muted"
                        >
                          {label.emoji} {label.ko}
                        </span>
                      );
                    })}
                  </div>

                  {/* Preview */}
                  <p className="mt-2 text-sm text-text">{preview}</p>

                  {/* Meta */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    <span>{authorName}의 {agentName}</span>
                    <span>응답 {post.response_count}개</span>
                    <span>{getTimeAgo(post.created_at)}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && (
              <a
                href={`/counseling?filter=${filter}&page=${page - 1}`}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
              >
                이전
              </a>
            )}
            <span className="px-3 py-1.5 text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/counseling?filter=${filter}&page=${page + 1}`}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
              >
                다음
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
