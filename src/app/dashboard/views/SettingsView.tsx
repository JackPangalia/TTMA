"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LoadingState } from "../components/LoadingState";

interface SettingsViewProps {
  tenantId: string;
  refreshKey: number;
}

export function SettingsView({ tenantId, refreshKey }: SettingsViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupsEnabled, setGroupsEnabled] = useState(false);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tenant/settings?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setGroupsEnabled(data.groupsEnabled ?? false);
        setGroupNames(data.groupNames ?? []);
      }
    } catch {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings, refreshKey]);

  async function saveSettings(
    updates: { groupsEnabled?: boolean; groupNames?: string[] }
  ) {
    setSaving(true);
    try {
      const res = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...updates }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      console.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    const next = !groupsEnabled;
    setGroupsEnabled(next);
    await saveSettings({ groupsEnabled: next });
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newGroup.trim();
    if (!trimmed) return;
    if (groupNames.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setNewGroup("");
      return;
    }
    const next = [...groupNames, trimmed];
    setGroupNames(next);
    setNewGroup("");
    inputRef.current?.focus();
    await saveSettings({ groupNames: next });
  }

  async function handleRemoveGroup(name: string) {
    const next = groupNames.filter((g) => g !== name);
    setGroupNames(next);
    await saveSettings({ groupNames: next });
  }

  if (loading) return <LoadingState />;

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {/* Groups toggle */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-5">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Groups</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            When enabled, workers will be asked to pick a group during registration.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            groupsEnabled
              ? "bg-accent dark:bg-accent"
              : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              groupsEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Group names */}
      {groupsEnabled && (
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Group Names
          </p>

          {/* Add group form */}
          <form onSubmit={handleAddGroup} className="mb-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a group — e.g. Electrical"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="flex-1 border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-accent focus:ring-1 focus:ring-accent-muted dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:ring-accent-muted"
            />
            <button
              type="submit"
              disabled={!newGroup.trim() || saving}
              className="shrink-0 bg-zinc-900 px-3 py-2 text-xs font-medium uppercase tracking-wide text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Add
            </button>
          </form>

          {/* Group list */}
          {groupNames.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              No groups configured. Add one above.
            </p>
          ) : (
            <div className="space-y-1">
              {groupNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {name}
                  </span>
                  <button
                    onClick={() => handleRemoveGroup(name)}
                    disabled={saving}
                    className="text-[10px] uppercase tracking-wide text-zinc-400 hover:text-red-500 disabled:opacity-50 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {saved && (
            <p className="mt-2 text-xs text-emerald-600 animate-fade-in dark:text-emerald-400">
              Saved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
