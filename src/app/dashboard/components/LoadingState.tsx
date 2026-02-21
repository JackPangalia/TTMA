export function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
      <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading...</p>
    </div>
  );
}
