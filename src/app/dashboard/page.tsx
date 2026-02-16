"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ───────────────────────────────────────────────────────────

type Tab = "active" | "history" | "users";

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

// ── Main Component ──────────────────────────────────────────────────

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // On mount, try fetching data to see if we're already authed (cookie).
  useEffect(() => {
    fetch("/api/dashboard?tab=active")
      .then((res) => {
        if (res.ok) setAuthed(true);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!authed) {
    return <PasswordGate onSuccess={() => setAuthed(true)} />;
  }

  return <Dashboard />;
}

// ── Password Gate ───────────────────────────────────────────────────

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8"
      >
        <h1 className="mb-1 text-xl font-bold text-zinc-100">TTMA Dashboard</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Enter the crew password to view tool data.
        </p>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
          autoFocus
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2.5 font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────────────

function Dashboard() {
  const [tab, setTab] = useState<Tab>("active");
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?tab=${t}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows ?? []);
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
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">TTMA Dashboard</h1>
            <p className="text-sm text-zinc-500">Tool tracking overview</p>
          </div>
          <button
            onClick={() => fetchData(tab)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
          >
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            No data to display.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            {tab === "active" && <ActiveTable rows={rows as ActiveRow[]} />}
            {tab === "history" && <HistoryTable rows={rows as HistoryRow[]} />}
            {tab === "users" && <UsersTable rows={rows as UserRow[]} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Table Components ────────────────────────────────────────────────

function ActiveTable({ rows }: { rows: ActiveRow[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 bg-zinc-900/80">
          <th className="px-4 py-3 font-medium text-zinc-400">Tool</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Checked Out By</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Since</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-zinc-800/50 transition hover:bg-zinc-900/50"
          >
            <td className="px-4 py-3 font-medium text-zinc-100">{row.tool}</td>
            <td className="px-4 py-3 text-zinc-300">{row.person}</td>
            <td className="px-4 py-3 text-zinc-500">
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
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 bg-zinc-900/80">
          <th className="px-4 py-3 font-medium text-zinc-400">Tool</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Person</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Checked Out</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Returned</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-zinc-800/50 transition hover:bg-zinc-900/50"
          >
            <td className="px-4 py-3 font-medium text-zinc-100">{row.tool}</td>
            <td className="px-4 py-3 text-zinc-300">{row.person}</td>
            <td className="px-4 py-3 text-zinc-500">
              {formatDate(row.checkedOutAt)}
            </td>
            <td className="px-4 py-3 text-zinc-500">
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
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 bg-zinc-900/80">
          <th className="px-4 py-3 font-medium text-zinc-400">Name</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Phone</th>
          <th className="px-4 py-3 font-medium text-zinc-400">Registered</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            className="border-b border-zinc-800/50 transition hover:bg-zinc-900/50"
          >
            <td className="px-4 py-3 font-medium text-zinc-100">{row.name}</td>
            <td className="px-4 py-3 text-zinc-300">{row.phone}</td>
            <td className="px-4 py-3 text-zinc-500">
              {formatDate(row.registeredAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
