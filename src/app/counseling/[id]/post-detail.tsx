"use client";

import { createClient } from "@/lib/supabase/client";
import { useCounselingStore } from "@/stores/counselingStore";
import { useState, useEffect } from "react";
import type { Agent } from "@/types/agent";

interface ResponseItem {
  id: string;
  post_id: string;
  responder_id: string;
  agent_id: string;
  content: string;
  is_best: boolean;
  created_at: string;
  responder_name: string;
  agent_name: string;
  agent: Agent | null;
}

interface Props {
  postId: string;
  postStatus: "open" | "resolved";
  bestResponseId: string | null;
  isAuthor: boolean;
  hasResponded: boolean;
  initialResponses: ResponseItem[];
  myAgents: { id: string; name: string }[];
}

export function PostDetail({
  postId,
  postStatus: initialStatus,
  bestResponseId: initialBestId,
  isAuthor,
  hasResponded: initialHasResponded,
  initialResponses,
  myAgents,
}: Props) {
  const [responses, setResponses] = useState<ResponseItem[]>(initialResponses);
  const [status, setStatus] = useState(initialStatus);
  const [bestId, setBestId] = useState(initialBestId);
  const [hasResponded, setHasResponded] = useState(initialHasResponded);
  const [showModal, setShowModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(myAgents[0]?.id ?? "");

  const {
    createResponse, responseLoading, responseError,
    selectBest, bestLoading, bestError,
  } = useCounselingStore();

  // Realtime: listen for new responses
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`counseling-responses-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "counseling_responses",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          // Fetch profile + agent name for the new response
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", newRow.responder_id)
            .single();
          const { data: agent } = await supabase
            .from("agents")
            .select("name")
            .eq("id", newRow.agent_id)
            .single();

          const item: ResponseItem = {
            id: newRow.id as string,
            post_id: newRow.post_id as string,
            responder_id: newRow.responder_id as string,
            agent_id: newRow.agent_id as string,
            content: newRow.content as string,
            is_best: false,
            created_at: newRow.created_at as string,
            responder_name: profile?.display_name ?? profile?.username ?? "익명",
            agent_name: agent?.name ?? "Unknown",
            agent: null,
          };

          setResponses((prev) => {
            if (prev.some((r) => r.id === item.id)) return prev;
            return [...prev, item];
          });
        },
      )
      .subscribe();

    // Listen for post updates (resolved)
    const postChannel = supabase
      .channel(`counseling-post-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "counseling_posts",
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.status === "resolved") {
            setStatus("resolved");
            setBestId(updated.best_response_id as string);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(postChannel);
    };
  }, [postId]);

  async function handleRespond() {
    if (!selectedAgentId || responseLoading) return;
    const responseId = await createResponse(postId, selectedAgentId);
    if (responseId) {
      setShowModal(false);
      setHasResponded(true);
    }
  }

  async function handleSelectBest(responseId: string) {
    if (bestLoading) return;
    const ok = await selectBest(postId, responseId);
    if (ok) {
      setStatus("resolved");
      setBestId(responseId);
      setResponses((prev) =>
        prev.map((r) => ({ ...r, is_best: r.id === responseId })),
      );
    }
  }

  const isOpen = status === "open";

  return (
    <div className="mt-6">
      {/* Action Button: Respond */}
      {isOpen && !isAuthor && !hasResponded && myAgents.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent/80"
        >
          내 에이전트로 상담하기
        </button>
      )}

      {hasResponded && !isAuthor && (
        <p className="rounded-lg bg-surface p-3 text-center text-sm text-text-muted">
          이미 이 상담에 응답했습니다
        </p>
      )}

      {/* Response Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg p-6">
            <h3 className="text-lg font-bold text-text">상담 에이전트 선택</h3>
            <p className="mt-1 text-sm text-text-muted">
              어떤 에이전트로 상담할까요?
            </p>

            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="mt-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              {myAgents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {responseError && (
              <p className="mt-2 text-sm text-danger">{responseError}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-muted hover:bg-surface-hover"
                disabled={responseLoading}
              >
                취소
              </button>
              <button
                onClick={handleRespond}
                disabled={responseLoading}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white hover:bg-accent/80 disabled:opacity-50"
              >
                {responseLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    생성 중...
                  </span>
                ) : (
                  "상담하기"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responses List */}
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-text">
          상담 응답 ({responses.length})
        </h2>

        {responses.length === 0 ? (
          <p className="text-sm text-text-muted">아직 응답이 없습니다.</p>
        ) : (
          responses.map((r) => {
            const isBest = r.id === bestId || r.is_best;
            const dimmed = !isOpen && !isBest;

            return (
              <div
                key={r.id}
                className={`rounded-xl border p-4 transition ${
                  isBest
                    ? "border-warning/50 bg-warning/5 ring-1 ring-warning/30"
                    : dimmed
                      ? "border-border/50 bg-surface/50 opacity-60"
                      : "border-border bg-surface"
                }`}
              >
                {/* Best badge */}
                {isBest && (
                  <div className="mb-2 flex items-center gap-1 text-xs font-bold text-warning">
                    <span>🏆</span> 최고의 상담사로 선정됨
                  </div>
                )}

                {/* Content */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {r.content}
                </p>

                {/* Meta + Best Selection */}
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
                  <div className="text-xs text-text-muted">
                    <span>{r.responder_name}의 {r.agent_name}</span>
                    <span className="mx-1.5">·</span>
                    <span>{getTimeAgo(r.created_at)}</span>
                  </div>

                  {isOpen && isAuthor && !isBest && (
                    <button
                      onClick={() => handleSelectBest(r.id)}
                      disabled={bestLoading}
                      className="rounded-lg border border-warning/30 px-2 py-1 text-xs font-medium text-warning transition hover:bg-warning/10 disabled:opacity-50"
                    >
                      {bestLoading ? "..." : "🏆 최고의 상담사 선택"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {bestError && (
        <p className="mt-2 text-sm text-danger">{bestError}</p>
      )}
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
