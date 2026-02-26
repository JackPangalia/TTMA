"use client";

import { useState, useEffect, useCallback } from "react";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";
import { getInitials } from "../utils";
import type { UserRow } from "../types";

interface CrewManagerProps {
  tenantId: string;
  refreshKey: number;
}

export function CrewManager({ tenantId, refreshKey }: CrewManagerProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?tenantId=${encodeURIComponent(tenantId)}&view=users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.rows ?? []);
      }
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshKey]);

  async function handleDelete(phone: string) {
    if (deletingPhone) return;
    setDeletingPhone(phone);
    try {
      const res = await fetch(
        `/api/users?tenantId=${encodeURIComponent(tenantId)}&phone=${encodeURIComponent(phone)}`,
        { method: "DELETE" }
      );
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
    <div className="divide-y-2 divide-zinc-800 dark:divide-zinc-600">
      {users.map((user, i) => (
        <div
          key={user.phone || i}
          className="flex items-center justify-between px-4 py-3 hover:bg-amber-50 sm:px-5 dark:hover:bg-zinc-800/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-zinc-800 bg-zinc-100 text-[10px] font-black text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {getInitials(user.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.name || "Unnamed"}</p>
                {user.group && (
                  <span className="inline-block border-2 border-zinc-800 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {user.group}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{user.phone}</p>
            </div>
          </div>
          <button
            onClick={() => handleDelete(user.phone)}
            disabled={deletingPhone === user.phone}
            className="cel-btn-press border-2 border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 hover:border-red-600 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:border-zinc-600 dark:hover:border-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            {deletingPhone === user.phone ? "Removing..." : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}
