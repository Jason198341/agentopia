"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "agentopia_openai_key";

export function ApiKeySettings({ freeBattles }: { freeBattles: number }) {
  const [key, setKey] = useState("");
  const [masked, setMasked] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHasKey(true);
      setMasked(maskKey(stored));
      setStatus("valid");
    }
  }, []);

  function maskKey(k: string): string {
    if (k.length < 8) return "sk-****";
    return k.slice(0, 5) + "..." + k.slice(-4);
  }

  async function handleValidate() {
    if (!key.trim()) return;
    setValidating(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key.trim() }),
      });
      const data = await res.json();

      if (data.valid) {
        localStorage.setItem(STORAGE_KEY, key.trim());
        setHasKey(true);
        setMasked(maskKey(key.trim()));
        setStatus("valid");
        setKey("");
      } else {
        setStatus("invalid");
        setErrorMsg(data.error ?? "Invalid key");
      }
    } catch {
      setStatus("invalid");
      setErrorMsg("Network error");
    } finally {
      setValidating(false);
    }
  }

  function handleRemove() {
    localStorage.removeItem(STORAGE_KEY);
    setHasKey(false);
    setMasked("");
    setStatus("idle");
    setKey("");
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Free Battle Status */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">무료 배틀</h2>
        <p className="mt-2 text-3xl font-bold text-primary">{freeBattles}<span className="text-lg text-text-muted">/50</span></p>
        {freeBattles <= 0 && (
          <p className="mt-2 text-sm text-danger">
            무료 배틀을 모두 사용했습니다. 아래에서 API 키를 등록하면 무제한으로 플레이할 수 있습니다.
          </p>
        )}
      </div>

      {/* API Key Section */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">OpenAI API 키</h2>
        <p className="mt-2 text-sm text-text-muted">
          자신의 OpenAI API 키를 등록하면 무료 배틀 소진 후에도 무제한으로 배틀할 수 있습니다.
          gpt-4o-mini 모델을 사용하며, 배틀 1회당 약 $0.01 미만입니다.
        </p>

        {hasKey ? (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-primary/30 bg-primary-dim px-4 py-2.5">
                <span className="font-mono text-sm text-primary">{masked}</span>
              </div>
              <button
                onClick={handleRemove}
                className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 transition"
              >
                삭제
              </button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-green-400">
              <CheckIcon /> 키가 등록되었습니다
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 font-mono text-sm text-text placeholder:text-text-muted/50 focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleValidate}
                disabled={!key.trim() || validating}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition disabled:opacity-50"
              >
                {validating ? "확인 중..." : "등록"}
              </button>
            </div>

            {status === "invalid" && (
              <p className="mt-2 text-sm text-danger">{errorMsg}</p>
            )}
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">보안 안내</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-muted">
          <li className="flex gap-2">
            <span className="text-primary">1.</span>
            API 키는 오직 브라우저의 localStorage에만 저장됩니다. 서버에 키를 저장하지 않습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">2.</span>
            배틀 요청 시 일회성으로 서버에 전달되며, 해당 배틀의 AI 호출에만 사용됩니다.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">3.</span>
            서버는 호출 완료 후 키를 메모리에서 즉시 폐기합니다. 로그에도 남기지 않습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">4.</span>
            언제든 위의 &quot;삭제&quot; 버튼으로 키를 제거할 수 있습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">5.</span>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              OpenAI API Keys 페이지
            </a>
            에서 키를 발급받을 수 있습니다.
          </li>
        </ul>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
