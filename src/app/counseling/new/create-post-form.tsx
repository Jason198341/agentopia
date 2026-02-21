"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCounselingStore } from "@/stores/counselingStore";
import { detectCrisis } from "@/types/counseling";
import { CrisisBanner } from "../[id]/crisis-banner";

interface Props {
  agents: { id: string; name: string }[];
}

export function CreatePostForm({ agents }: Props) {
  const router = useRouter();
  const { createPost, postLoading, postError } = useCounselingStore();
  const [rawInput, setRawInput] = useState("");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [showCrisis, setShowCrisis] = useState(false);

  const charCount = rawInput.length;
  const isValid = charCount >= 10 && charCount <= 2000 && agentId;

  function handleInputChange(value: string) {
    setRawInput(value);
    setShowCrisis(detectCrisis(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || postLoading) return;

    const postId = await createPost(rawInput.trim(), agentId);
    if (postId) {
      router.push(`/counseling/${postId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {/* Crisis Banner */}
      {showCrisis && <CrisisBanner />}

      {/* Agent Selection */}
      <div>
        <label className="text-sm font-medium text-text">정리할 에이전트 선택</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text-muted">
          에이전트의 스탯에 따라 감정 정리 스타일이 달라집니다
        </p>
      </div>

      {/* Raw Input */}
      <div>
        <label className="text-sm font-medium text-text">감정 쏟기</label>
        <textarea
          value={rawInput}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="지금 느끼는 감정을 자유롭게 적어보세요. 정리되지 않아도 괜찮습니다..."
          rows={8}
          className="mt-1 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          maxLength={2000}
        />
        <div className="mt-1 flex justify-between text-xs text-text-muted">
          <span>{charCount < 10 ? `최소 10자 (${10 - charCount}자 더 필요)` : ""}</span>
          <span className={charCount > 1800 ? "text-warning" : ""}>{charCount}/2000</span>
        </div>
      </div>

      {/* Error */}
      {postError && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {postError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || postLoading}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
      >
        {postLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            에이전트가 감정을 정리하는 중...
          </span>
        ) : (
          "에이전트에게 정리 맡기기"
        )}
      </button>
    </form>
  );
}
