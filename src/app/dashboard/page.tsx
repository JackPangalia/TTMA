"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardIndexPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm text-center animate-fade-in">
        <div className="border-2 border-zinc-800 bg-white p-8 cel-shadow dark:border-zinc-500 dark:bg-zinc-900">
          <h1 className="text-xl font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            TTMA
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Use the link your admin sent you to access your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
