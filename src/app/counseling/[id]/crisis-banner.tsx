export function CrisisBanner() {
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/5 p-4">
      <p className="text-sm font-bold text-danger">
        혹시 지금 힘든 상황에 처해 계신가요?
      </p>
      <p className="mt-1 text-sm text-text-muted">
        전문 상담사와 이야기하시면 도움이 됩니다. 아래 연락처는 24시간 운영됩니다.
      </p>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="rounded bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">KR</span>
          <span className="text-text">자살예방상담전화</span>
          <a href="tel:1393" className="font-bold text-accent hover:underline">1393</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">KR</span>
          <span className="text-text">정신건강위기상담</span>
          <a href="tel:1577-0199" className="font-bold text-accent hover:underline">1577-0199</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">US</span>
          <span className="text-text">Suicide &amp; Crisis Lifeline</span>
          <a href="tel:988" className="font-bold text-accent hover:underline">988</a>
        </div>
      </div>
    </div>
  );
}
