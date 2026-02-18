import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      {/* Top bar */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        >
          Dashboard
        </Link>
        <ThemeToggle />
      </div>

      {/* Subtle grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[48px_48px] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]" />

      <div className="relative mx-auto max-w-md text-center animate-fade-in">
        {/* Logo mark */}
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            TTMA
          </h1>
          <p className="mt-1.5 text-base font-medium text-zinc-500 dark:text-zinc-400">
            Trades Tool Management App
          </p>
        </div>

        {/* Description */}
        <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          Track tools on job sites via WhatsApp. Workers check tools in and out
          by sending a text — no app download, no login.
        </p>

        {/* How it works */}
        <div className="mt-10 space-y-3 text-left">
          <Feature
            step="1"
            title="Check out"
            example="grabbed the Dewalt Drill"
          />
          <Feature
            step="2"
            title="Return"
            example="bringing back the Circular Saw"
          />
          <Feature
            step="3"
            title="Status"
            example="who has the ladder?"
          />
        </div>

        {/* Status badge */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            Bot is running
          </span>
        </div>
      </div>
    </main>
  );
}

function Feature({
  step,
  title,
  example,
}: {
  step: string;
  title: string;
  example: string;
}) {
  return (
    <div className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 transition hover:border-zinc-300 hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
        {step}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-500">
          &ldquo;{example}&rdquo;
        </p>
      </div>
    </div>
  );
}
