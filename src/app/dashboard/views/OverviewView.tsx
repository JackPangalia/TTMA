"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration, getInitials } from "../utils";
import type { Tab, LogRow } from "../types";

interface OverviewData {
  totalTools: number;
  toolsOut: number;
  registeredCrew: number;
  avgDurationMs: number;
  recentOut: LogRow[];
  topCrew: { name: string; count: number }[];
}

interface OverviewViewProps {
  tenantId: string;
  refreshKey: number;
  onNavigate: (tab: Tab) => void;
}

function formatDurationShort(ms: number): string {
  if (ms <= 0) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

const sectionHeader =
  "flex items-center justify-between mb-3";
const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500";
const viewAllBtn =
  "text-[10px] font-medium uppercase tracking-wide text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors";
const card =
  "border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

export function OverviewView({ tenantId, refreshKey, onNavigate }: OverviewViewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logRes] = await Promise.all([
        fetch(`/api/dashboard?tenantId=${encodeURIComponent(tenantId)}&view=stats`),
        fetch(`/api/dashboard?tenantId=${encodeURIComponent(tenantId)}&view=log`),
      ]);

      const [statsData, logData] = await Promise.all([
        statsRes.ok ? statsRes.json() : null,
        logRes.ok ? logRes.json() : null,
      ]);

      const stats = statsData?.stats;
      const rows: LogRow[] = logData?.rows ?? [];

      const recentOut = rows
        .filter((r: LogRow) => r.status === "OUT")
        .slice(0, 5);

      setData({
        totalTools: stats?.totalTools ?? 0,
        toolsOut: stats?.toolsOut ?? 0,
        registeredCrew: stats?.registeredCrew ?? 0,
        avgDurationMs: stats?.avgDurationMs ?? 0,
        recentOut,
        topCrew: stats?.topCrew?.slice(0, 4) ?? [],
      });
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-800/20"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-800/20"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const toolUtilization = data.totalTools > 0
    ? Math.round((data.toolsOut / data.totalTools) * 100)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Key Metrics ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Tools
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {data.toolsOut}
              <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                /{data.totalTools}
              </span>
            </p>
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">out</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-zinc-900 transition-all duration-700 ease-out dark:bg-zinc-200"
              style={{ width: `${toolUtilization}%` }}
            />
          </div>
        </div>

        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Crew
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {data.registeredCrew}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">registered</p>
        </div>

        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Avg Hold
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatDurationShort(data.avgDurationMs)}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">per checkout</p>
        </div>
      </div>

      {/* ── Tools Currently Out + Crew Snapshot ──────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Tools Currently Out */}
        <div className={card}>
          <div className={sectionHeader}>
            <p className={sectionLabel}>Currently Out</p>
            <button onClick={() => onNavigate("tools")} className={viewAllBtn}>
              View All →
            </button>
          </div>

          {data.recentOut.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
              All tools are available
            </p>
          ) : (
            <div className="space-y-0.5">
              {data.recentOut.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {row.tool}
                      </p>
                      <p className="truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                        {row.person}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 ml-3 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {row.checkedOutAt ? formatDuration(row.checkedOutAt) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crew Snapshot */}
        <div className={card}>
          <div className={sectionHeader}>
            <p className={sectionLabel}>Top Crew</p>
            <button onClick={() => onNavigate("crew")} className={viewAllBtn}>
              Manage →
            </button>
          </div>

          {data.topCrew.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
              No crew activity yet
            </p>
          ) : (
            <div className="space-y-0.5">
              {data.topCrew.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center justify-between py-2 px-2 -mx-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {getInitials(member.name)}
                    </div>
                    <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {member.name}
                    </p>
                  </div>
                  <span className="shrink-0 ml-3 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {member.count} checkout{member.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("stats")}
          className="group flex items-center gap-3 border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
        >
          <svg className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <div>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">View Full Stats</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Charts, trends & usage</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate("settings")}
          className="group flex items-center gap-3 border border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
        >
          <svg className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <div>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Settings</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Groups & configuration</p>
          </div>
        </button>
      </div>
    </div>
  );
}
