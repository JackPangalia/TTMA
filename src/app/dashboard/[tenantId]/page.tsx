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
        <div className="h-6 w-6 animate-cel-spin border-3 border-zinc-800 border-t-transparent dark:border-zinc-400 dark:border-t-transparent" />
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
