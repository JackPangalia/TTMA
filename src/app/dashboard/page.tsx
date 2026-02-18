"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────

type Role = "admin" | "worker";
type Tab = "log" | "tools" | "crew" | "checkout";
type Filter = "active" | "returned" | "all";

interface LogRow {
  id: string;
  tool: string;
  person: string;
  phone: string;
  status: "OUT" | "RETURNED";
  checkedOutAt: string;
  returnedAt: string | null;
}

interface UserRow {
  phone: string;
  name: string;
  registeredAt: string;
}

interface ToolRow {
  id: string;
  name: string;
  aliases?: string[];
  createdAt: string;
}

// ── Entry Point ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
      </div>
    );
  }

  if (!role) {
    return <LoginScreen onLogin={setRole} />;
  }

  return <Dashboard role={role} onLogout={() => setRole(null)} />;
}

// ── Login Screen ────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.role) {
        onLogin(data.role);
      } else {
        setError(data.error || "Incorrect password");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-zinc-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">TTMA Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Enter your crew password</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mb-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20"
          />
          {error && (
            <p className="mb-3 text-sm text-red-500 animate-fade-in">{error}</p>
          )}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tab config ──────────────────────────────────────────────────────

const ALL_TABS: { id: Tab; label: string; adminOnly: boolean; icon: React.ReactNode }[] = [
  {
    id: "log",
    label: "Tool Log",
    adminOnly: false,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
    ),
  },
  {
    id: "tools",
    label: "Tools",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" />
      </svg>
    ),
  },
  {
    id: "crew",
    label: "Crew",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    id: "checkout",
    label: "Checkout",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
      </svg>
    ),
  },
];

// ── Dashboard ───────────────────────────────────────────────────────

function Dashboard({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("log");
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleTabs = ALL_TABS.filter((t) => !t.adminOnly || role === "admin");

  function refresh() {
    setRefreshKey((k) => k + 1);
    setLastUpdatedLabel("just now");
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">TTMA</span>
            </Link>
            <span className="hidden text-sm text-zinc-300 sm:inline dark:text-zinc-700">/</span>
            <span className="hidden text-sm font-medium text-zinc-500 sm:inline dark:text-zinc-400">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              role === "admin"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}>
              {role === "admin" ? "Admin" : "Viewer"}
            </span>
            {lastUpdatedLabel && (
              <span className="hidden text-xs text-zinc-400 sm:inline dark:text-zinc-600">
                {lastUpdatedLabel}
              </span>
            )}
            <button
              onClick={refresh}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              title="Refresh"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
            <ThemeToggle />
            <button
              onClick={() => {
                document.cookie = "ttma-auth=; path=/; max-age=0";
                onLogout();
              }}
              className="flex h-9 items-center rounded-lg border border-zinc-300 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {tab === "log" && <LogView role={role} refreshKey={refreshKey} onRefreshed={() => setLastUpdatedLabel("just now")} />}
          {tab === "tools" && <ToolsManager refreshKey={refreshKey} />}
          {tab === "crew" && <CrewManager refreshKey={refreshKey} />}
          {tab === "checkout" && <ManualCheckout onCheckout={refresh} />}
        </div>
      </div>
    </div>
  );
}

// ── Log View (the spreadsheet) ──────────────────────────────────────

function LogView({
  role,
  refreshKey,
  onRefreshed,
}: {
  role: Role;
  refreshKey: number;
  onRefreshed: () => void;
}) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");
  const [search, setSearch] = useState("");

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard?view=log");
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows ?? []);
        onRefreshed();
      }
    } catch {
      console.error("Failed to fetch log");
    } finally {
      setLoading(false);
    }
  }, [onRefreshed]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog, refreshKey]);

  const filtered = rows.filter((row) => {
    if (filter === "active" && row.status !== "OUT") return false;
    if (filter === "returned" && row.status !== "RETURNED") return false;
    if (search) {
      const q = search.toLowerCase();
      return row.tool.toLowerCase().includes(q) || row.person.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = rows.filter((r) => r.status === "OUT").length;

  const [returningId, setReturningId] = useState<string | null>(null);

  async function handleForceReturn(id: string) {
    setReturningId(id);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchLog();
    } finally {
      setReturningId(null);
    }
  }

  return (
    <div>
      {/* Filter bar + search */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
          {(["active", "returned", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {f}
              {f === "active" && activeCount > 0 && (
                <span className="ml-1 opacity-50">{activeCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search tool or person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/20 sm:w-56 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-amber-500 dark:focus:bg-zinc-800 dark:focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            search
              ? `No results for "${search}"`
              : filter === "active"
                ? "No tools are currently checked out."
                : filter === "returned"
                  ? "No return records yet."
                  : "No tool activity yet."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className={thClass}>Tool</th>
                <th className={thClass}>Person</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Checked Out</th>
                <th className={thClass}>Returned</th>
                {role === "admin" && <th className={`${thClass} text-right`}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={trClass}>
                  <td className={`${tdClass} font-medium text-zinc-900 dark:text-zinc-100`}>
                    {row.tool}
                  </td>
                  <td className={`${tdClass} text-zinc-600 dark:text-zinc-300`}>{row.person}</td>
                  <td className={tdClass}>
                    {row.status === "OUT" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-dot" />
                        OUT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        RETURNED
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} tabular-nums text-zinc-500 dark:text-zinc-400`}>
                    {formatDate(row.checkedOutAt)}
                  </td>
                  <td className={`${tdClass} tabular-nums text-zinc-500 dark:text-zinc-400`}>
                    {row.returnedAt ? formatDate(row.returnedAt) : (
                      <span className="text-zinc-400 dark:text-zinc-600">{formatDuration(row.checkedOutAt)}</span>
                    )}
                  </td>
                  {role === "admin" && (
                    <td className={`${tdClass} text-right`}>
                      {row.status === "OUT" && (
                        <button
                          onClick={() => handleForceReturn(row.id)}
                          disabled={returningId === row.id}
                          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-red-500/50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          {returningId === row.id ? "..." : "Return"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tools Manager ───────────────────────────────────────────────────

function ToolsManager({ refreshKey }: { refreshKey: number }) {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard?view=tools");
      if (res.ok) {
        const data = await res.json();
        setTools(data.rows ?? []);
      }
    } catch {
      console.error("Failed to fetch tools");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools, refreshKey]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setJustAdded(trimmed);
        setName("");
        fetchTools();
        inputRef.current?.focus();
        setTimeout(() => setJustAdded(null), 2000);
      }
    } catch {
      console.error("Failed to add tool");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tools/${id}`, { method: "DELETE" });
      if (res.ok) fetchTools();
    } catch {
      console.error("Failed to delete tool");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Add form */}
      <div className="border-b border-zinc-200 bg-zinc-50/50 p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-800/20">
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a tool — e.g. Dewalt DCD771 Drill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim() || adding}
            className="shrink-0 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {adding ? "Adding..." : "Add Tool"}
          </button>
        </form>
        {justAdded && (
          <p className="mt-2 text-sm text-emerald-600 animate-fade-in dark:text-emerald-400">
            {justAdded} added.
          </p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState />
      ) : tools.length === 0 ? (
        <EmptyState message="No tools yet. Add your first one above." />
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {tools.map((tool, i) => (
            <div
              key={tool.id || i}
              className="flex items-center justify-between px-4 py-3 transition hover:bg-zinc-50 sm:px-5 dark:hover:bg-zinc-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-4 w-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tool.name}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Added {formatDate(tool.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(tool.id)}
                disabled={deletingId === tool.id}
                className="rounded-md px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                {deletingId === tool.id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Crew Manager ────────────────────────────────────────────────────

function CrewManager({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard?view=users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.rows ?? []);
      }
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshKey]);

  async function handleDelete(phone: string) {
    if (deletingPhone) return;
    setDeletingPhone(phone);
    try {
      const res = await fetch(`/api/users?phone=${encodeURIComponent(phone)}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch {
      console.error("Failed to delete user");
    } finally {
      setDeletingPhone(null);
    }
  }

  if (loading) return <LoadingState />;

  if (users.length === 0) {
    return <EmptyState message="No workers registered yet. They'll appear here after messaging the bot." />;
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
      {users.map((user, i) => (
        <div
          key={user.phone || i}
          className="flex items-center justify-between px-4 py-3 transition hover:bg-zinc-50 sm:px-5 dark:hover:bg-zinc-800/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {getInitials(user.name)}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.name || "Unnamed"}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{user.phone}</p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(user.phone)}
            disabled={deletingPhone === user.phone}
            className="rounded-md px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            {deletingPhone === user.phone ? "Removing..." : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Manual Checkout (redesigned) ────────────────────────────────────

function ManualCheckout({ onCheckout }: { onCheckout: () => void }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recentActions, setRecentActions] = useState<{ text: string; ok: boolean }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard?view=users").then((r) => r.json()),
      fetch("/api/dashboard?view=tools").then((r) => r.json()),
    ])
      .then(([uData, tData]) => {
        setUsers(uData.rows ?? []);
        setTools(tData.rows ?? []);
      })
      .catch(() => console.error("Failed to fetch data"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPhone || !selectedTool || submitting) return;

    const user = users.find((u) => u.phone === selectedPhone);
    if (!user) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: selectedTool,
          person: user.name,
          phone: user.phone,
        }),
      });

      if (res.ok) {
        setRecentActions((prev) => [
          { text: `${selectedTool} → ${user.name}`, ok: true },
          ...prev.slice(0, 4),
        ]);
        setSelectedTool("");
        onCheckout();
      } else {
        const data = await res.json();
        setRecentActions((prev) => [
          { text: data.error || "Failed to check out", ok: false },
          ...prev.slice(0, 4),
        ]);
      }
    } catch {
      setRecentActions((prev) => [
        { text: "Connection error", ok: false },
        ...prev.slice(0, 4),
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  const selectedUser = users.find((u) => u.phone === selectedPhone);

  return (
    <div>
      {/* Form */}
      <div className="border-b border-zinc-200 p-5 sm:p-6 dark:border-zinc-800">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Check out a tool on behalf of a worker
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Worker selection — card-style */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Worker
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {users.map((u) => (
                <button
                  key={u.phone}
                  type="button"
                  onClick={() => setSelectedPhone(u.phone === selectedPhone ? "" : u.phone)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                    selectedPhone === u.phone
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/20 dark:border-amber-500 dark:bg-amber-500/10 dark:ring-amber-500/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selectedPhone === u.phone
                      ? "bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}>
                    {getInitials(u.name)}
                  </div>
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {u.name || "Unnamed"}
                  </span>
                </button>
              ))}
            </div>
            {users.length === 0 && (
              <p className="mt-2 text-sm text-zinc-400">No workers registered yet.</p>
            )}
          </div>

          {/* Tool selection — card-style */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Tool
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {tools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTool(t.name === selectedTool ? "" : t.name)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                    selectedTool === t.name
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400/20 dark:border-amber-500 dark:bg-amber-500/10 dark:ring-amber-500/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                  }`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    selectedTool === t.name
                      ? "bg-amber-200 dark:bg-amber-500/30"
                      : "bg-zinc-100 dark:bg-zinc-700"
                  }`}>
                    <svg className={`h-3.5 w-3.5 ${selectedTool === t.name ? "text-amber-800 dark:text-amber-300" : "text-zinc-500 dark:text-zinc-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852Z" />
                    </svg>
                  </div>
                  <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
            {tools.length === 0 && (
              <p className="mt-2 text-sm text-zinc-400">No tools added yet. Add tools in the Tools tab.</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={!selectedPhone || !selectedTool || submitting}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting
                ? "Checking out..."
                : selectedPhone && selectedTool
                  ? `Check out ${selectedTool} to ${selectedUser?.name ?? "..."}`
                  : "Select worker & tool"}
            </button>
          </div>
        </form>
      </div>

      {/* Recent actions feed */}
      {recentActions.length > 0 && (
        <div className="px-5 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Recent
          </p>
          <div className="space-y-1.5">
            {recentActions.map((action, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-sm animate-fade-in ${
                  action.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                }`}
              >
                {action.ok ? (
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
                {action.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────────────

const thClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500";
const tdClass = "px-4 py-3 text-sm";
const trClass =
  "border-t border-zinc-100 transition hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30";

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
      <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-20">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
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

function formatDuration(iso: string): string {
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

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
