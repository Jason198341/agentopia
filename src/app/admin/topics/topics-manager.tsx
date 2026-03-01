"use client";

import { useState } from "react";
import { safeFetch } from "@/lib/api-error";

type Difficulty = "casual" | "standard" | "advanced";

interface Topic {
  id: string;
  topic: string;
  category: string;
  difficulty: Difficulty;
  is_active: boolean;
  use_count: number;
  pro_wins: number;
  con_wins: number;
}

const CATEGORIES = [
  "technology", "politics", "science", "economics", "culture",
  "ethics", "psychology", "environment", "history", "philosophy",
];

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; color: string }> = {
  casual: { label: "캐주얼", color: "text-success" },
  standard: { label: "스탠다드", color: "text-warning" },
  advanced: { label: "어드밴스드", color: "text-danger" },
};

export function TopicsManager({ initialTopics }: { initialTopics: Topic[] }) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [filter, setFilter] = useState<"all" | Difficulty>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopic, setNewTopic] = useState({ topic: "", category: "technology", difficulty: "standard" as Difficulty });
  const [saving, setSaving] = useState(false);

  const filtered = topics.filter((t) => {
    if (filter !== "all" && t.difficulty !== filter) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (!showInactive && !t.is_active) return false;
    return true;
  });

  const stats = {
    total: topics.length,
    active: topics.filter((t) => t.is_active).length,
    casual: topics.filter((t) => t.difficulty === "casual").length,
    standard: topics.filter((t) => t.difficulty === "standard").length,
    advanced: topics.filter((t) => t.difficulty === "advanced").length,
  };

  async function handleToggleActive(t: Topic) {
    try {
      const res = await safeFetch("/api/admin/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
      });
      const updated = await res.json();
      setTopics((prev) => prev.map((p) => (p.id === t.id ? updated : p)));
    } catch {
      // silently ignore: optimistic toggle not applied
    }
  }

  async function handleSaveEdit(t: Topic, newText: string) {
    if (newText === t.topic) { setEditingId(null); return; }
    try {
      const res = await safeFetch("/api/admin/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, topic: newText }),
      });
      const updated = await res.json();
      setTopics((prev) => prev.map((p) => (p.id === t.id ? updated : p)));
    } catch {
      // silently ignore: edit not applied
    }
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("이 주제를 삭제하시겠습니까?")) return;
    try {
      await safeFetch(`/api/admin/topics?id=${id}`, { method: "DELETE" });
      setTopics((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silently ignore: deletion not applied
    }
  }

  async function handleAdd() {
    if (!newTopic.topic.trim()) return;
    setSaving(true);
    try {
      const res = await safeFetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTopic),
      });
      const created = await res.json();
      setTopics((prev) => [...prev, created]);
      setNewTopic({ topic: "", category: "technology", difficulty: "standard" });
      setShowAddForm(false);
    } catch {
      // silently ignore: topic not added
    }
    setSaving(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">주제 관리</h1>
          <p className="text-sm text-text-muted">토론 주제 CRUD · {stats.total}개 ({stats.active}개 활성)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/80"
          >
            + 주제 추가
          </button>
          <a href="/admin" className="text-sm text-text-muted hover:text-text">&larr; 관리자</a>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-4 grid grid-cols-5 gap-2">
        {[
          { label: "전체", count: stats.total, color: "text-text" },
          { label: "활성", count: stats.active, color: "text-primary" },
          { label: "캐주얼", count: stats.casual, color: "text-success" },
          { label: "스탠다드", count: stats.standard, color: "text-warning" },
          { label: "어드밴스드", count: stats.advanced, color: "text-danger" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-surface p-4">
          <h3 className="mb-3 text-sm font-bold text-text">새 주제 추가</h3>
          <label htmlFor="new-topic-text" className="sr-only">토론 주제</label>
          <input
            id="new-topic-text"
            type="text"
            placeholder="토론 주제 입력..."
            value={newTopic.topic}
            onChange={(e) => setNewTopic((p) => ({ ...p, topic: e.target.value }))}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted"
          />
          <div className="mt-2 flex gap-2">
            <label htmlFor="new-topic-category" className="sr-only">카테고리</label>
            <select
              id="new-topic-category"
              value={newTopic.category}
              onChange={(e) => setNewTopic((p) => ({ ...p, category: e.target.value }))}
              className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label htmlFor="new-topic-difficulty" className="sr-only">난이도</label>
            <select
              id="new-topic-difficulty"
              value={newTopic.difficulty}
              onChange={(e) => setNewTopic((p) => ({ ...p, difficulty: e.target.value as Difficulty }))}
              className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text"
            >
              <option value="casual">캐주얼</option>
              <option value="standard">스탠다드</option>
              <option value="advanced">어드밴스드</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={saving || !newTopic.topic.trim()}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["all", "casual", "standard", "advanced"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === d ? "bg-primary text-white" : "border border-border bg-surface text-text-muted hover:bg-surface-hover"
            }`}
          >
            {d === "all" ? "전체" : DIFFICULTY_LABELS[d].label}
          </button>
        ))}
        <span className="mx-1 text-text-muted">|</span>
        <label htmlFor="cat-filter" className="sr-only">카테고리 필터</label>
        <select
          id="cat-filter"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text"
        >
          <option value="all">카테고리 전체</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          비활성 포함
        </label>
      </div>

      {/* Topics Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-3 py-2">주제</th>
              <th className="px-3 py-2 w-24">카테고리</th>
              <th className="px-3 py-2 w-20 text-center">난이도</th>
              <th className="px-3 py-2 w-16 text-center">사용</th>
              <th className="px-3 py-2 w-20 text-center">PRO/CON</th>
              <th className="px-3 py-2 w-24 text-center">상태</th>
              <th className="px-3 py-2 w-16 text-center">삭제</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-border transition hover:bg-surface-hover ${
                  !t.is_active ? "opacity-40" : ""
                }`}
              >
                <td className="px-3 py-2">
                  {editingId === t.id ? (
                    <EditableCell
                      value={t.topic}
                      onSave={(v) => handleSaveEdit(t, v)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(t.id)}
                      className="text-left text-sm text-text hover:text-primary"
                    >
                      {t.topic}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-text-muted">{t.category}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-xs font-medium ${DIFFICULTY_LABELS[t.difficulty].color}`}>
                    {DIFFICULTY_LABELS[t.difficulty].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-mono text-xs text-text-muted">{t.use_count}</td>
                <td className="px-3 py-2 text-center text-xs">
                  <span className="text-success">{t.pro_wins}</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-danger">{t.con_wins}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleToggleActive(t)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      t.is_active
                        ? "bg-success/20 text-success"
                        : "bg-danger/20 text-danger"
                    }`}
                  >
                    {t.is_active ? "활성" : "비활성"}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-danger/50 hover:text-danger"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">
                  조건에 맞는 주제가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        표시: {filtered.length}개 / 전체 {topics.length}개
      </p>
    </div>
  );
}

function EditableCell({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="flex items-center gap-1">
      <label htmlFor="editable-topic-cell" className="sr-only">주제 수정</label>
      <input
        id="editable-topic-cell"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(text);
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 rounded border border-primary bg-bg px-2 py-1 text-sm text-text"
      />
      <button onClick={() => onSave(text)} className="text-xs text-primary">
        저장
      </button>
      <button onClick={onCancel} className="text-xs text-text-muted">
        취소
      </button>
    </div>
  );
}
