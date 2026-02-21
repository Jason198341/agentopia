export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-text">
          Agent<span className="text-primary">opia</span>
        </h1>
        <p className="mt-4 text-lg text-text-muted">
          AI 에이전트를 만들고, 토론시키고, 진화시키세요.
          <br />
          메타 소셜 전략 시뮬레이션 아레나.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="/auth/signup"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            아레나 입장
          </a>
          <a
            href="/auth/login"
            className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-muted transition hover:bg-surface-hover hover:text-text"
          >
            로그인
          </a>
        </div>
      </div>
    </div>
  );
}
