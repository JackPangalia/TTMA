export const thClass =
  "px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400 sm:px-4 sm:py-3 sm:text-xs dark:text-zinc-500";
export const tdClass = "px-3 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm";
export const trClass =
  "border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30";

export function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDuration(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return "< 1m";
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  } catch {
    return "";
  }
}

export function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
