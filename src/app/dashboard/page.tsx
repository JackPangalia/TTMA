"use client";

import { useState, useEffect, useCallback } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Types ───────────────────────────────────────────────────────────

type Tab = "active" | "history" | "users" | "tools";

interface ActiveRow {
  tool: string;
  person: string;
  phone: string;
  checkedOutAt: string;
}

interface HistoryRow {
  tool: string;
  person: string;
  phone: string;
  checkedOutAt: string;
  returnedAt: string;
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

// ── Main Component ──────────────────────────────────────────────────

export default function DashboardPage() {
  return <Dashboard />;
}

// ── Dashboard ───────────────────────────────────────────────────────

function getRowCount(tab: Tab, rows: unknown[]): number {
  return Array.isArray(rows) ? rows.length : 0;
}

function getEmptyHint(tab: Tab): string {
  switch (tab) {
    case "active":
      return "Tools will appear here when workers check them out.";
    case "history":
      return "Return records will appear here.";
    case "users":
      return "Workers will appear here after they register via WhatsApp.";
    case "tools":
      return "Add tools in the table above.";
    default:
      return "";
  }
}

function formatRelativeTime(ms: number): string {
  if (ms < 5000) return "Just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

function Dashboard() {
  const [tab, setTab] = useState<Tab>("active");
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?tab=${t}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows ?? []);
        setLastUpdated(Date.now());
      }
    } catch {
      console.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab);
  }, [tab, fetchData]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "active", label: "Active Checkouts" },
    { id: "history", label: "History" },
    { id: "users", label: "Users" },
    { id: "tools", label: "Tools" },
  ];

  const rowCount = getRowCount(tab, rows);

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">TTMA Dashboard</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-500">Tool tracking overview</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => fetchData(tab)}
                disabled={loading}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                Refresh
              </button>
              {lastUpdated && (
                <span className="text-xs text-zinc-500 dark:text-zinc-600">
                  Updated {formatRelativeTime(Date.now() - lastUpdated)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-0 flex border-b border-zinc-300 dark:border-zinc-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.label}
              {tab === t.id && !loading && (
                <span className="ml-1.5 text-zinc-500">({rowCount})</span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100" />
              )}
            </button>
          ))}
        </div>

        {/* Table container */}
        <div className="overflow-x-auto rounded-b-lg border border-t-0 border-zinc-300 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="h-2 w-24 animate-pulse rounded bg-zinc-300 dark:bg-zinc-700" />
              <p className="text-sm text-zinc-600 dark:text-zinc-500">Loading data...</p>
            </div>
          ) : tab === "tools" ? (
            <ToolsTable
              rows={rows as ToolRow[]}
              onAdd={() => fetchData("tools")}
              onDelete={() => fetchData("tools")}
            />
          ) : rows.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-500">No data to display.</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-600">{getEmptyHint(tab)}</p>
            </div>
          ) : (
            <>
              {tab === "active" && <ActiveTable rows={rows as ActiveRow[]} />}
              {tab === "history" && <HistoryTable rows={rows as HistoryRow[]} />}
              {tab === "users" && <UsersTable rows={rows as UserRow[]} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared table cell styles ────────────────────────────────────────

const thClass =
  "px-3 py-2 font-medium text-zinc-600 text-left text-sm border-r border-b border-zinc-200 last:border-r-0 bg-zinc-50 dark:text-zinc-400 dark:border-zinc-700/50 dark:bg-zinc-900";
const tdClass =
  "px-3 py-2 text-sm border-r border-b border-zinc-200 last:border-r-0 dark:border-zinc-700/50";
const trBaseClass =
  "border-b border-zinc-200 transition hover:bg-zinc-50 even:bg-zinc-50/50 dark:border-zinc-700/50 dark:hover:bg-zinc-800/50 dark:even:bg-zinc-900/30";

// ── Table Components ────────────────────────────────────────────────

function ActiveTable({ rows }: { rows: ActiveRow[] }) {
  return (
    <table className="w-full text-left text-sm border-collapse">
      <thead className="sticky top-0 z-10">
        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <th className={thClass}>Tool</th>
          <th className={thClass}>Checked Out By</th>
          <th className={thClass}>Since</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={trBaseClass}>
            <td className={`${tdClass} font-medium text-zinc-900 dark:text-zinc-100`}>{row.tool}</td>
            <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{row.person}</td>
            <td className={`${tdClass} text-zinc-600 tabular-nums dark:text-zinc-500`}>
              {formatDate(row.checkedOutAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <table className="w-full text-left text-sm border-collapse">
      <thead className="sticky top-0 z-10">
        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <th className={thClass}>Tool</th>
          <th className={thClass}>Person</th>
          <th className={thClass}>Checked Out</th>
          <th className={thClass}>Returned</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={trBaseClass}>
            <td className={`${tdClass} font-medium text-zinc-900 dark:text-zinc-100`}>{row.tool}</td>
            <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{row.person}</td>
            <td className={`${tdClass} text-zinc-600 tabular-nums dark:text-zinc-500`}>
              {formatDate(row.checkedOutAt)}
            </td>
            <td className={`${tdClass} text-zinc-600 tabular-nums dark:text-zinc-500`}>
              {formatDate(row.returnedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsersTable({ rows }: { rows: UserRow[] }) {
  return (
    <table className="w-full text-left text-sm border-collapse">
      <thead className="sticky top-0 z-10">
        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
          <th className={thClass}>Name</th>
          <th className={thClass}>Phone</th>
          <th className={thClass}>Registered</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={trBaseClass}>
            <td className={`${tdClass} font-medium text-zinc-900 dark:text-zinc-100`}>{row.name}</td>
            <td className={`${tdClass} font-mono text-xs text-zinc-700 dark:text-zinc-300`}>
              {row.phone}
            </td>
            <td className={`${tdClass} text-zinc-600 tabular-nums dark:text-zinc-500`}>
              {formatDate(row.registeredAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ToolsTable({
  rows,
  onAdd,
  onDelete,
}: {
  rows: ToolRow[];
  onAdd: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setName("");
        onAdd();
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
      if (res.ok) onDelete();
    } catch {
      console.error("Failed to delete tool");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
              <th className={thClass}>Tool</th>
              <th className={thClass}>Added</th>
              <th className={thClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className={`${trBaseClass} bg-zinc-50 dark:bg-zinc-800/30`}>
              <td className={`${tdClass} border-b border-zinc-200 dark:border-zinc-700/50`}>
                <form
                  onSubmit={handleAdd}
                  className="flex items-center gap-2"
                  id="add-tool-form"
                >
                  <input
                    type="text"
                    placeholder="Tool name (e.g. Dewalt DCD771 Drill)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </form>
              </td>
              <td className={`${tdClass} border-b border-zinc-200 dark:border-zinc-700/50`}></td>
              <td className={`${tdClass} border-b border-zinc-200 align-top dark:border-zinc-700/50`}>
                <button
                  form="add-tool-form"
                  type="submit"
                  disabled={!name.trim() || adding}
                  className="rounded border border-zinc-400 bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-300 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                >
                  {adding ? "Adding..." : "Add"}
                </button>
              </td>
            </tr>
            {rows.map((row) => (
              <tr key={row.id} className={trBaseClass}>
                <td className={`${tdClass} font-medium text-zinc-900 dark:text-zinc-100`}>
                  {row.name}
                </td>
                <td className={`${tdClass} text-zinc-600 tabular-nums dark:text-zinc-500`}>
                  {formatDate(row.createdAt)}
                </td>
                <td className={tdClass}>
                  <button
                    onClick={() => handleDelete(row.id)}
                    disabled={deletingId === row.id}
                    className="text-sm text-red-400 transition hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === row.id ? "Removing..." : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
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
