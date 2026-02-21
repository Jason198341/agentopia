export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl animate-pulse">
        <div className="h-8 w-36 rounded bg-surface" />
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
