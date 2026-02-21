"use client";

import { useState, useEffect, use } from "react";
import { LoginScreen } from "../components/LoginScreen";
import { Dashboard } from "../Dashboard";
import type { Role } from "../types";

export default function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const [role, setRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch(`/api/auth?tenantId=${encodeURIComponent(tenantId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .finally(() => setChecking(false));
  }, [tenantId]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
      </div>
    );
  }

  if (!role) {
    return <LoginScreen tenantId={tenantId} onLogin={setRole} />;
  }

  return (
    <Dashboard role={role} tenantId={tenantId} onLogout={() => setRole(null)} />
  );
}
