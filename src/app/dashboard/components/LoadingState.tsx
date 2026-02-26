export function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="h-6 w-6 animate-cel-spin border-3 border-zinc-800 border-t-transparent dark:border-zinc-400 dark:border-t-transparent" />
      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">Loading...</p>
    </div>
  );
}
