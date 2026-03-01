"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text">
            Agent<span className="text-primary">opia</span>
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            아레나에 입장하세요
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-text-muted"
            >
              사용자명
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="^[a-zA-Z0-9_]+$"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="agent_master"
            />
            <p className="mt-1 text-xs text-text-muted">
              영문, 숫자, 밑줄(_). 3~20자.
            </p>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-muted"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-muted"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-text-muted">
              6자 이상.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "계정 생성 중…" : "계정 만들기"}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary hover:text-primary-hover"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
