export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="h-6 w-48 rounded bg-surface" />
        <div className="mt-2 h-4 w-24 rounded bg-surface" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
