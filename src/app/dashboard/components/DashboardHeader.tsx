"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Role } from "../types";

interface DashboardHeaderProps {
  role: Role;
  lastUpdatedLabel: string | null;
  onRefresh: () => void;
  onLogout: () => void;
  scrolled: boolean;
}

export function DashboardHeader({
  role,
  lastUpdatedLabel,
  onRefresh,
  onLogout,
  scrolled,
}: DashboardHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-20 transition-colors duration-200 ${
        scrolled
          ? "border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80"
          : ""
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-bold uppercase tracking-wider text-zinc-900 hover:opacity-80 dark:text-zinc-100"
          >
            TTMA
          </Link>
          <span className="hidden text-xs text-zinc-300 sm:inline dark:text-zinc-700">/</span>
          <span className="hidden text-xs font-medium uppercase tracking-wide text-zinc-500 sm:inline dark:text-zinc-400">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              role === "admin"
                ? "bg-accent-muted text-accent-fg dark:bg-accent-dim dark:text-accent"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {role === "admin" ? "Admin" : "Viewer"}
          </span>
          {lastUpdatedLabel && (
            <span className="hidden text-xs text-zinc-400 sm:inline dark:text-zinc-600">
              {lastUpdatedLabel}
            </span>
          )}
          <button
            onClick={onRefresh}
            className="flex h-8 w-8 items-center justify-center border border-zinc-300 bg-zinc-100 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            title="Refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
          <ThemeToggle />
          <button
            onClick={() => {
              document.cookie = "ttma-auth=; path=/; max-age=0";
              onLogout();
            }}
            className="flex h-8 items-center border border-zinc-300 bg-zinc-100 px-2.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
