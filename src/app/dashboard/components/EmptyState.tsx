export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-20">
      <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}
