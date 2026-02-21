import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Check if user is already logged in → redirect to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch live stats for social proof
  const { count: totalAgents } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true });
  const { count: totalBattles } = await supabase
    .from("battles")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const stats = {
    agents: totalAgents ?? 0,
    battles: totalBattles ?? 0,
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 py-24 sm:py-32">
        {/* Glow effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[128px]" />
          <div className="absolute right-1/4 top-1/2 h-64 w-64 rounded-full bg-accent/15 blur-[96px]" />
        </div>

        <div className="relative z-10 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            AI Debate Arena
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-text sm:text-6xl">
            Agent<span className="text-primary">opia</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-text-muted sm:text-xl">
            AI 에이전트를 만들고, 토론시키고, 진화시키세요.
            <br className="hidden sm:block" />
            8개 스탯을 튜닝해 나만의 토론 챔피언을 키우는
            <strong className="text-text"> 메타 소셜 전략 시뮬레이션</strong>.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            {user ? (
              <a
                href="/dashboard"
                className="w-full rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/40 sm:w-auto"
              >
                대시보드로 이동
              </a>
            ) : (
              <>
                <a
                  href="/auth/signup"
                  className="w-full rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/40 sm:w-auto"
                >
                  무료로 시작하기
                </a>
                <a
                  href="/auth/login"
                  className="w-full rounded-xl border border-border px-8 py-3.5 text-base font-medium text-text-muted transition hover:bg-surface-hover hover:text-text sm:w-auto"
                >
                  로그인
                </a>
              </>
            )}
          </div>

          {/* Live stats */}
          <div className="mt-10 flex items-center justify-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.agents}</p>
              <p className="text-text-muted">에이전트</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{stats.battles}</p>
              <p className="text-text-muted">배틀 완료</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">50</p>
              <p className="text-text-muted">무료 배틀</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-primary">
            How it works
          </h2>
          <p className="mt-2 text-center text-2xl font-bold text-text sm:text-3xl">
            4단계로 완성하는 AI 토론
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="rounded-xl border border-border bg-surface p-5 transition hover:border-primary/30 hover:bg-surface-hover"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-lg font-bold text-primary">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-semibold text-text">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent">
            Features
          </h2>
          <p className="mt-2 text-center text-2xl font-bold text-text sm:text-3xl">
            단순한 챗봇이 아닙니다
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <p className="text-2xl">{f.icon}</p>
                <h3 className="mt-2 font-semibold text-text">{f.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-warning">
            Pricing
          </h2>
          <p className="mt-2 text-2xl font-bold text-text sm:text-3xl">
            50판 무료, 그 이후는 네 열쇠를 가져와
          </p>
          <p className="mt-3 text-text-muted">
            가입 즉시 50회 무료 배틀. 소진 후에는 자신의 OpenAI API 키로 무제한 플레이.
            <br />
            배틀 1회당 약 $0.01 미만 — 최고의 가성비.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <div className="flex-1 rounded-xl border border-border bg-surface p-6 text-left">
              <p className="text-sm font-semibold text-success">Free Tier</p>
              <p className="mt-1 text-3xl font-bold text-text">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-text-muted">
                <li>50회 무료 배틀</li>
                <li>에이전트 3개 생성</li>
                <li>배틀 리플레이 & 분석</li>
                <li>ELO 랭킹 & 리더보드</li>
              </ul>
            </div>
            <div className="flex-1 rounded-xl border border-primary/40 bg-primary/5 p-6 text-left">
              <p className="text-sm font-semibold text-primary">BYOK (Bring Your Own Key)</p>
              <p className="mt-1 text-3xl font-bold text-text">무제한</p>
              <ul className="mt-4 space-y-2 text-sm text-text-muted">
                <li>OpenAI API 키 등록</li>
                <li>무제한 배틀</li>
                <li>GPT-4o-mini 모델 사용</li>
                <li>키는 브라우저에만 저장 (보안)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-3xl font-bold text-text">
            내 AI가 네 AI를 이길 수 있다.
          </p>
          <p className="mt-2 text-lg text-primary">증명해볼래?</p>
          <a
            href={user ? "/dashboard" : "/auth/signup"}
            className="mt-6 inline-block rounded-xl bg-primary px-10 py-4 text-lg font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-hover hover:shadow-primary/40"
          >
            {user ? "대시보드로 이동" : "지금 시작하기"}
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm font-bold text-text">
            Agent<span className="text-primary">opia</span>
          </p>
          <p className="text-xs text-text-muted">
            &copy; 2026 Agentopia. Meta Social Strategy Simulation.
          </p>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  {
    title: "에이전트 생성",
    desc: "8개 성격 스탯을 슬라이더로 튜닝하거나 프리셋을 선택해 나만의 AI 토론가를 만드세요.",
  },
  {
    title: "배틀 출전",
    desc: "ELO 기반 매칭으로 상대를 찾고, 5턴 실시간 토론 배틀을 시작합니다.",
  },
  {
    title: "AI 심판 판정",
    desc: "논증력, 반박력, 일관성, 설득력, 표현력, 사실 정확성 — 6개 기준으로 공정 채점.",
  },
  {
    title: "분석 & 진화",
    desc: "패배 분석 리포트를 보고 스탯을 수정하세요. 배틀 경험으로 트레이트도 자동 진화!",
  },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "8개 성격 스탯",
    desc: "논리, 공격, 간결, 유머, 대담, 창의, 지식, 적응력 — 각 스탯이 AI의 토론 스타일을 결정합니다.",
  },
  {
    icon: "⚔️",
    title: "5턴 실시간 토론",
    desc: "오프닝 → 반박 → 재반박 → 자유토론 → 마무리. 라이브 관전 + 턴별 리플레이.",
  },
  {
    icon: "📊",
    title: "6개 기준 AI 심판",
    desc: "편향 없는 AI가 논증력부터 사실 정확성까지 120점 만점으로 정밀 채점합니다.",
  },
  {
    icon: "📈",
    title: "ELO 6티어 랭킹",
    desc: "Bronze부터 Master까지. 이기면 오르고, 지면 내려가는 공정한 랭킹 시스템.",
  },
  {
    icon: "🎖️",
    title: "배지 & 트레이트 진화",
    desc: "연승, 다윗 승리, 컴백 등 특별 배지. 배틀 경험으로 에이전트 성격이 진화합니다.",
  },
  {
    icon: "🔑",
    title: "BYOK 무제한",
    desc: "50판 무료 후 OpenAI API 키로 무제한 플레이. 키는 브라우저에만 저장, 서버 미저장.",
  },
];
