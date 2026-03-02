"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DashboardStatsProps {
  tenantId: string;
  refreshKey: number;
}

interface ToolUsageItem {
  name: string;
  count: number;
  avgMs: number;
  totalMs: number;
}

interface StatsData {
  totalTools: number;
  toolsOut: number;
  registeredCrew: number;
  totalCheckouts: number;
  toolUsage: ToolUsageItem[];
  activityDays: { date: string; out: number; in: number }[];
  topCrew: { name: string; count: number }[];
  avgDurationMs: number;
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

function formatTotalHours(ms: number): string {
  if (ms <= 0) return "0h";
  const hours = ms / 3600000;
  if (hours < 1) return `${Math.round(ms / 60000)}m`;
  if (hours < 100) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round(hours)}h`;
}

const card =
  "border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const sectionTitle =
  "text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4";
const thClass =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500";
const tdClass = "px-3 py-2.5 text-xs";

export function DashboardStats({ tenantId, refreshKey }: DashboardStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllTools, setShowAllTools] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/dashboard?tenantId=${encodeURIComponent(tenantId)}&view=stats`
        );
        if (res.ok) {
          const data = await res.json();
          if (mounted) setStats(data.stats);
        }
      } catch {
        /* silently fail */
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchStats();
    return () => {
      mounted = false;
    };
  }, [tenantId, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-800/20"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-800/20" />
        <div className="h-56 animate-pulse border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-800/20" />
      </div>
    );
  }

  if (!stats) return null;

  const utilization = stats.totalTools > 0
    ? Math.round((stats.toolsOut / stats.totalTools) * 100)
    : 0;

  const defaultToolCount = 8;
  const hasMoreTools = stats.toolUsage.length > defaultToolCount;
  const visibleTools = showAllTools
    ? stats.toolUsage
    : stats.toolUsage.slice(0, defaultToolCount);
  const maxTotalMs = Math.max(...stats.toolUsage.map((t) => t.totalMs), 1);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`${card} relative overflow-hidden`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Tools
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {stats.toolsOut}
              <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
                /{stats.totalTools}
              </span>
            </p>
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">out</span>
            {stats.toolsOut > 0 && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-zinc-900 transition-all duration-700 ease-out dark:bg-zinc-200"
              style={{ width: `${utilization}%` }}
            />
          </div>
        </div>

        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Checkouts
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {stats.totalCheckouts.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">all time</p>
        </div>

        <div className={card}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Avg Hold Time
          </p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatDurationShort(stats.avgDurationMs)}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">per checkout</p>
        </div>
      </div>

      {/* ── Activity Chart ───────────────────────────────────────── */}
      <div className={card}>
        <p className={sectionTitle}>Activity — Last 14 Days</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={stats.activityDays}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-grid, #e4e4e7)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-tooltip-bg, #fff)",
                  border: "1px solid var(--color-tooltip-border, #e4e4e7)",
                  borderRadius: "0",
                  fontSize: 12,
                  padding: "8px 12px",
                }}
                labelStyle={{ fontWeight: 600, fontSize: 11, marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="out"
                stroke="#18181b"
                strokeWidth={1.5}
                fill="url(#gradOut)"
                name="Out"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="in"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#gradIn)"
                name="In"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tool Usage ───────────────────────────────────────────── */}
      <div className={card}>
        <p className={sectionTitle}>Tool Usage</p>
        {stats.toolUsage.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
            No usage data yet
          </p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className={thClass}>Tool</th>
                    <th className={`${thClass} w-[40%]`}>Usage</th>
                    <th className={`${thClass} text-right`}>Checkouts</th>
                    <th className={`${thClass} text-right`}>Avg Hold</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTools.map((tool) => (
                    <tr
                      key={tool.name}
                      className="border-t border-zinc-50 hover:bg-zinc-50/60 dark:border-zinc-800/30 dark:hover:bg-zinc-800/20"
                    >
                      <td className={`${tdClass} font-medium text-zinc-800 dark:text-zinc-200`}>
                        {tool.name}
                      </td>
                      <td className={tdClass}>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className="h-full bg-zinc-900 transition-all duration-700 ease-out dark:bg-zinc-200"
                              style={{ width: `${(tool.totalMs / maxTotalMs) * 100}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                            {formatTotalHours(tool.totalMs)}
                          </span>
                        </div>
                      </td>
                      <td className={`${tdClass} text-right tabular-nums text-zinc-600 dark:text-zinc-400`}>
                        {tool.count}
                      </td>
                      <td className={`${tdClass} text-right tabular-nums text-zinc-500 dark:text-zinc-400`}>
                        {formatDurationShort(tool.avgMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMoreTools && (
              <button
                onClick={() => setShowAllTools(!showAllTools)}
                className="mt-3 w-full py-2 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
              >
                {showAllTools
                  ? "Show less"
                  : `Show all ${stats.toolUsage.length} tools`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Top Crew ─────────────────────────────────────────────── */}
      {stats.topCrew.length > 0 && (
        <div className={card}>
          <p className={sectionTitle}>Top Crew</p>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {stats.topCrew.map((member) => {
              const initials = member.name
                .split(" ")
                .map((w) => w[0])
                .filter(Boolean)
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <div
                  key={member.name}
                  className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800/50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-zinc-100 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {member.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                    {member.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
