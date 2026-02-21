export default function BattleDetailLoading() {
  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-4 w-20 rounded bg-surface" />
        <div className="mt-4 h-32 rounded-xl border border-border bg-surface" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
