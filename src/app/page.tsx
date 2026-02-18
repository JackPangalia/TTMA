import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto max-w-xs text-center animate-fade-in">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          TTMA
        </h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Trades Tool Management App
        </p>

        <div className="mt-6 text-left text-xs">
          <div className="flex gap-3 border-y border-zinc-200 py-2 dark:border-zinc-800">
            <span className="font-medium uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Check out</span>
            <span className="ml-auto text-zinc-400 dark:text-zinc-500">&ldquo;grabbed the Dewalt Drill&rdquo;</span>
          </div>
          <div className="flex gap-3 border-b border-zinc-200 py-2 dark:border-zinc-800">
            <span className="font-medium uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Return</span>
            <span className="ml-auto text-zinc-400 dark:text-zinc-500">&ldquo;bringing back the Saw&rdquo;</span>
          </div>
          <div className="flex gap-3 border-b border-zinc-200 py-2 dark:border-zinc-800">
            <span className="font-medium uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Status</span>
            <span className="ml-auto text-zinc-400 dark:text-zinc-500">&ldquo;who has the ladder?&rdquo;</span>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-block border border-zinc-300 px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
