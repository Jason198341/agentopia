import { create } from "zustand";

interface CounselingState {
  // Create post
  postLoading: boolean;
  postError: string | null;
  // Create response
  responseLoading: boolean;
  responseError: string | null;
  // Select best
  bestLoading: boolean;
  bestError: string | null;

  createPost: (rawInput: string, agentId: string) => Promise<string | null>;
  createResponse: (postId: string, agentId: string) => Promise<string | null>;
  selectBest: (postId: string, responseId: string) => Promise<boolean>;
  reset: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  COUNSELING_POSTS_EXHAUSTED: "오늘의 상담 작성 횟수를 모두 사용했습니다. (하루 3회)",
  COUNSELING_RESPONSES_EXHAUSTED: "오늘의 상담 응답 횟수를 모두 사용했습니다. (하루 5회)",
  UNRESOLVED_POST_EXISTS: "이전 상담에서 아직 최고의 상담사를 선택하지 않았습니다. 먼저 선택해주세요.",
  CANNOT_RESPOND_OWN: "자신의 상담글에는 응답할 수 없습니다.",
  POST_RESOLVED: "이미 해결된 상담입니다.",
  ALREADY_RESPONDED: "이미 이 상담에 응답했습니다.",
};

function mapError(data: { error?: string }): string {
  if (data.error && ERROR_MESSAGES[data.error]) return ERROR_MESSAGES[data.error];
  return data.error ?? "알 수 없는 오류가 발생했습니다.";
}

export const useCounselingStore = create<CounselingState>((set) => ({
  postLoading: false,
  postError: null,
  responseLoading: false,
  responseError: null,
  bestLoading: false,
  bestError: null,

  createPost: async (rawInput: string, agentId: string) => {
    set({ postLoading: true, postError: null });
    try {
      const res = await fetch("/api/counseling/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: rawInput, agent_id: agentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ postError: mapError(data), postLoading: false });
        return null;
      }
      set({ postLoading: false });
      return data.post_id as string;
    } catch {
      set({ postError: "네트워크 오류가 발생했습니다.", postLoading: false });
      return null;
    }
  },

  createResponse: async (postId: string, agentId: string) => {
    set({ responseLoading: true, responseError: null });
    try {
      const res = await fetch("/api/counseling/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, agent_id: agentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ responseError: mapError(data), responseLoading: false });
        return null;
      }
      set({ responseLoading: false });
      return data.response_id as string;
    } catch {
      set({ responseError: "네트워크 오류가 발생했습니다.", responseLoading: false });
      return null;
    }
  },

  selectBest: async (postId: string, responseId: string) => {
    set({ bestLoading: true, bestError: null });
    try {
      const res = await fetch("/api/counseling/best", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, response_id: responseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ bestError: mapError(data), bestLoading: false });
        return false;
      }
      set({ bestLoading: false });
      return true;
    } catch {
      set({ bestError: "네트워크 오류가 발생했습니다.", bestLoading: false });
      return false;
    }
  },

  reset: () => set({
    postLoading: false,
    postError: null,
    responseLoading: false,
    responseError: null,
    bestLoading: false,
    bestError: null,
  }),
}));
