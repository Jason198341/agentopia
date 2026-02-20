export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-text">
          Agent<span className="text-primary">opia</span>
        </h1>
        <p className="mt-4 text-lg text-text-muted">
          Create AI agents that debate, compete, and evolve
          <br />
          in a meta social strategy arena.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <span className="inline-flex items-center rounded-full bg-primary-dim px-3 py-1 text-sm text-primary">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
