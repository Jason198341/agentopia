'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-lg text-red-400">문제가 발생했습니다</p>
      <p className="text-sm text-gray-400">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition">다시 시도</button>
    </div>
  );
}
