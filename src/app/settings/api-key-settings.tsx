"use client";

import { useState, useEffect } from "react";
import { PROVIDER_CONFIG, DEFAULT_MODELS } from "@/lib/providers";
import type { Provider } from "@/lib/providers";

const PROVIDERS: Provider[] = ["openai", "claude", "gemini"];

// localStorage keys
const STORAGE_KEYS: Record<Provider, string> = {
  openai: "agentopia_openai_key",
  claude: "agentopia_claude_key",
  gemini: "agentopia_gemini_key",
};
const PROVIDER_STORAGE = "agentopia_provider";
const MODEL_STORAGE = "agentopia_model";

export function ApiKeySettings({ freeBattles }: { freeBattles: number }) {
  const [activeProvider, setActiveProvider] = useState<Provider>("openai");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODELS.openai);
  const [keyInput, setKeyInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Per-provider key state
  const [savedKeys, setSavedKeys] = useState<Record<Provider, string | null>>({
    openai: null,
    claude: null,
    gemini: null,
  });

  // Load saved state on mount
  useEffect(() => {
    const loaded: Record<Provider, string | null> = { openai: null, claude: null, gemini: null };
    for (const p of PROVIDERS) {
      loaded[p] = localStorage.getItem(STORAGE_KEYS[p]);
    }
    setSavedKeys(loaded);

    const savedProvider = localStorage.getItem(PROVIDER_STORAGE) as Provider | null;
    if (savedProvider && PROVIDERS.includes(savedProvider)) {
      setActiveProvider(savedProvider);
      const savedModel = localStorage.getItem(MODEL_STORAGE);
      const validModels = PROVIDER_CONFIG[savedProvider].models.map((m) => m.id);
      setSelectedModel(validModels.includes(savedModel ?? "") ? savedModel! : DEFAULT_MODELS[savedProvider]);
    }
  }, []);

  // When provider tab changes, update model selection
  function switchProvider(p: Provider) {
    setActiveProvider(p);
    setKeyInput("");
    setStatus("idle");
    setErrorMsg("");

    const savedModel = localStorage.getItem(MODEL_STORAGE);
    const validModels = PROVIDER_CONFIG[p].models.map((m) => m.id);
    const model = validModels.includes(savedModel ?? "") ? savedModel! : DEFAULT_MODELS[p];
    setSelectedModel(model);

    localStorage.setItem(PROVIDER_STORAGE, p);
  }

  function handleModelChange(modelId: string) {
    setSelectedModel(modelId);
    localStorage.setItem(MODEL_STORAGE, modelId);
  }

  async function handleValidate() {
    if (!keyInput.trim()) return;
    setValidating(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: keyInput.trim(), provider: activeProvider }),
      });
      const data = await res.json();

      if (data.valid) {
        localStorage.setItem(STORAGE_KEYS[activeProvider], keyInput.trim());
        localStorage.setItem(PROVIDER_STORAGE, activeProvider);
        localStorage.setItem(MODEL_STORAGE, selectedModel);
        setSavedKeys((prev) => ({ ...prev, [activeProvider]: keyInput.trim() }));
        setStatus("valid");
        setKeyInput("");
      } else {
        setStatus("invalid");
        setErrorMsg(data.error ?? "Invalid key");
      }
    } catch {
      setStatus("invalid");
      setErrorMsg("네트워크 오류");
    } finally {
      setValidating(false);
    }
  }

  function handleRemove() {
    localStorage.removeItem(STORAGE_KEYS[activeProvider]);
    setSavedKeys((prev) => ({ ...prev, [activeProvider]: null }));
    setStatus("idle");
    setKeyInput("");
  }

  function maskKey(k: string): string {
    if (k.length < 10) return "****";
    return k.slice(0, 7) + "..." + k.slice(-4);
  }

  const config = PROVIDER_CONFIG[activeProvider];
  const currentKey = savedKeys[activeProvider];
  const hasAnyKey = Object.values(savedKeys).some(Boolean);

  return (
    <div className="mt-6 space-y-6">
      {/* Free Battle Status */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">무료 배틀</h2>
        <p className="mt-2 text-3xl font-bold text-primary">
          {freeBattles}<span className="text-lg text-text-muted">/50</span>
        </p>
        {freeBattles <= 0 && !hasAnyKey && (
          <p className="mt-2 text-sm text-danger">
            무료 배틀을 모두 사용했습니다. 아래에서 API 키를 등록하면 무제한으로 플레이할 수 있습니다.
          </p>
        )}
        {freeBattles <= 0 && hasAnyKey && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-green-400">
            <CheckIcon /> API 키 등록됨 — 무제한 배틀 가능
          </p>
        )}
      </div>

      {/* Provider Tabs */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex border-b border-border">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => switchProvider(p)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition relative ${
                activeProvider === p
                  ? "text-primary bg-primary-dim"
                  : "text-text-muted hover:text-text hover:bg-surface-hover"
              }`}
            >
              {PROVIDER_CONFIG[p].name}
              {savedKeys[p] && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-green-400" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Model Selector */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              모델 선택
            </label>
            <div className="mt-2 grid gap-2">
              {config.models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModelChange(m.id)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-left transition ${
                    selectedModel === m.id
                      ? "border-primary bg-primary-dim text-text"
                      : "border-border bg-bg text-text-muted hover:border-border hover:bg-surface-hover"
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="ml-2 text-xs text-text-muted font-mono">{m.id}</span>
                  </div>
                  <span className="text-xs text-text-muted">{m.costPerBattle}/배틀</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              {config.name} API 키
            </label>
            <p className="mt-1 text-sm text-text-muted">
              배틀 1회당 {config.models.find((m) => m.id === selectedModel)?.costPerBattle ?? "소액"} 정도 소요됩니다.
              키는 브라우저에만 저장되며 서버에 영구 저장하지 않습니다.
            </p>

            {currentKey ? (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg border border-primary/30 bg-primary-dim px-4 py-2.5">
                    <span className="font-mono text-sm text-primary">{maskKey(currentKey)}</span>
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
              <div className="mt-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder={config.keyPlaceholder}
                    className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 font-mono text-sm text-text placeholder:text-text-muted/50 focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={handleValidate}
                    disabled={!keyInput.trim() || validating}
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
        </div>
      </div>

      {/* API Key Guide */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          {config.name} API 키 발급 방법
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-text-muted list-decimal pl-5">
          {activeProvider === "openai" && (
            <>
              <li><a href="https://platform.openai.com/signup" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">platform.openai.com</a> 에 가입합니다.</li>
              <li>Settings &gt; API keys &gt; &quot;Create new secret key&quot; 를 클릭합니다.</li>
              <li>생성된 키 (sk-...)를 복사해서 위에 붙여넣습니다.</li>
              <li>결제 수단을 등록해야 API를 사용할 수 있습니다 (Billing &gt; Payment methods).</li>
            </>
          )}
          {activeProvider === "claude" && (
            <>
              <li><a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.anthropic.com</a> 에 가입합니다.</li>
              <li>Settings &gt; API keys &gt; &quot;Create Key&quot; 를 클릭합니다.</li>
              <li>생성된 키 (sk-ant-...)를 복사해서 위에 붙여넣습니다.</li>
              <li>Plans &gt; Billing에서 결제 수단을 등록해야 합니다.</li>
            </>
          )}
          {activeProvider === "gemini" && (
            <>
              <li><a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">aistudio.google.com</a> 에 Google 계정으로 로그인합니다.</li>
              <li>&quot;Get API key&quot; &gt; &quot;Create API key&quot; 를 클릭합니다.</li>
              <li>생성된 키를 복사해서 위에 붙여넣습니다.</li>
              <li>Gemini는 무료 티어가 있어 소규모 사용 시 비용이 들지 않을 수 있습니다.</li>
            </>
          )}
        </ol>
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
            언제든 &quot;삭제&quot; 버튼으로 키를 제거할 수 있습니다.
          </li>
          <li className="flex gap-2">
            <span className="text-primary">5.</span>
            <span>
              브라우저 개발자 도구(F12) &gt; Application &gt; Local Storage에서{" "}
              <code className="text-accent">agentopia_*</code> 키가 저장된 것을 직접 확인할 수 있습니다.
            </span>
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
