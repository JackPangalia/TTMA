"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";
import { Dropdown } from "../components/Dropdown";
import { formatDuration, thClass, tdClass, trClass } from "../utils";
import type { Role, Filter, LogRow, UserRow } from "../types";

interface TenantSettings {
  groupsEnabled: boolean;
  groupNames: string[];
}

interface LogViewProps {
  role: Role;
  tenantId: string;
  refreshKey: number;
  onRefreshed: () => void;
}

export function LogView({ role, tenantId, refreshKey, onRefreshed }: LogViewProps) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [returningId, setReturningId] = useState<string | null>(null);

  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [crew, setCrew] = useState<UserRow[]>([]);
  const [newToolName, setNewToolName] = useState("");
  const [newToolGroup, setNewToolGroup] = useState("");
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);
  const [assigningRowId, setAssigningRowId] = useState<string | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?tenantId=${encodeURIComponent(tenantId)}&view=log`);
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
  }, [tenantId, onRefreshed]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog, refreshKey]);

  useEffect(() => {
    if (role !== "admin") return;
    Promise.all([
      fetch(`/api/tenant/settings?tenantId=${encodeURIComponent(tenantId)}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/dashboard?tenantId=${encodeURIComponent(tenantId)}&view=users`).then((r) =>
        r.ok ? r.json() : null
      ),
    ]).then(([settingsData, usersData]) => {
      if (settingsData) setSettings(settingsData);
      if (usersData) setCrew(usersData.rows ?? []);
    });
  }, [tenantId, role]);

  const showGroupSelect = settings?.groupsEnabled && (settings.groupNames?.length ?? 0) > 0;

  const groupOptions = [
    { value: "", label: "No group" },
    ...(settings?.groupNames ?? []).map((g) => ({ value: g, label: g })),
  ];

  const crewOptions = crew.map((u) => ({
    value: u.phone,
    label: u.name || u.phone,
  }));

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.group) set.add(row.group);
    }
    return Array.from(set).sort();
  }, [rows]);

  const hasGroups = groups.length > 0;

  const filtered = rows.filter((row) => {
    if (filter === "out" && row.status !== "OUT") return false;
    if (filter === "available" && row.status !== "AVAILABLE") return false;
    if (groupFilter !== "all" && row.group !== groupFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return row.tool.toLowerCase().includes(q) || row.person.toLowerCase().includes(q);
    }
    return true;
  });

  const outCount = rows.filter((r) => r.status === "OUT").length;
  const availableCount = rows.filter((r) => r.status === "AVAILABLE").length;

  async function handleForceReturn(id: string) {
    setReturningId(id);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tenantId }),
      });
      if (res.ok) fetchLog();
    } finally {
      setReturningId(null);
    }
  }

  async function handleAssign(toolName: string, phone: string) {
    const person = crew.find((u) => u.phone === phone);
    if (!person) return;

    setAssignBusy(true);
    try {
      const res = await fetch("/api/admin/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          tool: toolName,
          person: person.name,
          phone: person.phone,
        }),
      });
      if (res.ok) {
        setAssigningRowId(null);
        fetchLog();
      }
    } catch {
      console.error("Failed to assign tool");
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleAddTool(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newToolName.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, tenantId, group: newToolGroup || null }),
      });
      if (res.ok) {
        setJustAdded(trimmed);
        setNewToolName("");
        setNewToolGroup("");
        fetchLog();
        inputRef.current?.focus();
        setTimeout(() => setJustAdded(null), 2000);
      }
    } catch {
      console.error("Failed to add tool");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteTool(toolId: string) {
    if (deletingId) return;
    setDeletingId(toolId);
    try {
      const res = await fetch(
        `/api/tools/${toolId}?tenantId=${encodeURIComponent(tenantId)}`,
        { method: "DELETE" }
      );
      if (res.ok) fetchLog();
    } catch {
      console.error("Failed to delete tool");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleGroupChange(toolId: string, newGroup: string) {
    setUpdatingGroupId(toolId);
    try {
      const res = await fetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, group: newGroup || null }),
      });
      if (res.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.toolId === toolId ? { ...r, group: newGroup || null } : r
          )
        );
      }
    } catch {
      console.error("Failed to update group");
    } finally {
      setUpdatingGroupId(null);
    }
  }

  const emptyMessage = search
    ? `No results for "${search}"`
    : filter === "out"
      ? "No tools are currently checked out."
      : filter === "available"
        ? "No tools available."
        : "No tools yet.";

  const groupDropdownOptions = [
    { value: "all", label: "All Groups" },
    ...groups.map((g) => ({ value: g, label: g })),
  ];

  return (
    <div>
      {role === "admin" && (
        <div className="border-b border-zinc-200 bg-zinc-50/50 p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-800/20">
          <form onSubmit={handleAddTool} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Add a tool — e.g. Dewalt DCD771 Drill"
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
                className="w-full border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-accent focus:ring-1 focus:ring-accent-muted dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:ring-accent-muted"
              />
            </div>
            {showGroupSelect && (
              <div className="w-40">
                <Dropdown
                  value={newToolGroup}
                  options={groupOptions}
                  onChange={setNewToolGroup}
                  placeholder="No group"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={!newToolName.trim() || adding}
              className="shrink-0 bg-zinc-900 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
      )}

      <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex border border-zinc-200 dark:border-zinc-700">
            {(["all", "out", "available"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`border-r border-zinc-200 px-3 py-2 text-[10px] font-medium uppercase tracking-wide last:border-r-0 dark:border-zinc-700 ${
                  filter === f
                    ? "bg-zinc-900 text-white dark:bg-zinc-700 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {f}
                {f === "out" && outCount > 0 && (
                  <span className="ml-1 opacity-50">{outCount}</span>
                )}
                {f === "available" && availableCount > 0 && (
                  <span className="ml-1 opacity-50">{availableCount}</span>
                )}
              </button>
            ))}
          </div>
          {hasGroups && (
            <div className="w-36">
              <Dropdown
                value={groupFilter}
                options={groupDropdownOptions}
                onChange={setGroupFilter}
                placeholder="All Groups"
                size="sm"
              />
            </div>
          )}
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
            className="w-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent-muted sm:w-56 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:bg-zinc-800 dark:focus:ring-accent-muted"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className={thClass}>Tool</th>
                <th className={thClass}>Person</th>
                {hasGroups && <th className={thClass}>Group</th>}
                <th className={thClass}>Status</th>
                <th className={thClass}>Since</th>
                {role === "admin" && <th className={`${thClass} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={trClass}>
                  <td className={`${tdClass} font-medium text-zinc-900 dark:text-zinc-100`}>
                    {row.tool}
                  </td>
                  <td className={`${tdClass} text-zinc-600 dark:text-zinc-300`}>
                    {row.person || <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                  </td>
                  {hasGroups && (
                    <td className={`${tdClass} text-zinc-500 dark:text-zinc-400`}>
                      {role === "admin" && row.toolId && showGroupSelect ? (
                        <div className="w-28">
                          <Dropdown
                            value={row.group ?? ""}
                            options={groupOptions}
                            onChange={(v) => handleGroupChange(row.toolId!, v)}
                            placeholder="No group"
                            disabled={updatingGroupId === row.toolId}
                            size="sm"
                          />
                        </div>
                      ) : row.group ? (
                        <span className="inline-block bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide dark:bg-zinc-800">
                          {row.group}
                        </span>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                      )}
                    </td>
                  )}
                  <td className={tdClass}>
                    {row.status === "OUT" ? (
                      <span className="inline-flex items-center gap-1.5 bg-accent-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-fg dark:bg-accent-dim dark:text-accent">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
                        Out
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Available
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} tabular-nums text-zinc-500 dark:text-zinc-400`}>
                    {row.checkedOutAt ? (
                      <span className="text-zinc-400 dark:text-zinc-600">
                        {formatDuration(row.checkedOutAt)}
                      </span>
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </td>
                  {role === "admin" && (
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        {row.status === "OUT" && (
                          <button
                            onClick={() => handleForceReturn(row.id)}
                            disabled={returningId === row.id}
                            className="border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                          >
                            {returningId === row.id ? "..." : "Return"}
                          </button>
                        )}
                        {row.status === "AVAILABLE" && crew.length > 0 && (
                          assigningRowId === row.id ? (
                            <div className="flex items-center gap-1">
                              <div className="w-36">
                                <Dropdown
                                  value=""
                                  options={crewOptions}
                                  onChange={(phone) => handleAssign(row.tool, phone)}
                                  placeholder="Select person"
                                  disabled={assignBusy}
                                  size="sm"
                                />
                              </div>
                              <button
                                onClick={() => setAssigningRowId(null)}
                                className="px-1.5 py-1 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssigningRowId(row.id)}
                              className="border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600 hover:border-accent hover:bg-accent-muted hover:text-accent-fg disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-accent dark:hover:bg-accent-dim dark:hover:text-accent"
                            >
                              Assign
                            </button>
                          )
                        )}
                        {row.toolId && (
                          <button
                            onClick={() => handleDeleteTool(row.toolId!)}
                            disabled={deletingId === row.toolId}
                            className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                          >
                            {deletingId === row.toolId ? "..." : "Remove"}
                          </button>
                        )}
                      </div>
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
