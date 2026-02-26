"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardTabs } from "./components/DashboardTabs";
import { LogView } from "./views/LogView";
import { CrewManager } from "./views/CrewManager";
import { SettingsView } from "./views/SettingsView";
import type { Role, Tab } from "./types";

interface DashboardProps {
  role: Role;
  tenantId: string;
  onLogout: () => void;
}

export function Dashboard({ role, tenantId, onLogout }: DashboardProps) {
  const [tab, setTab] = useState<Tab>("tools");
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function refresh() {
    setRefreshKey((k) => k + 1);
    setLastUpdatedLabel("just now");
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        role={role}
        lastUpdatedLabel={lastUpdatedLabel}
        onRefresh={refresh}
        onLogout={onLogout}
        scrolled={scrolled}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {role === "admin" && (
          <DashboardTabs role={role} tab={tab} onTabChange={setTab} />
        )}

        <div className="overflow-hidden border-2 border-zinc-800 bg-white cel-shadow dark:border-zinc-600 dark:bg-zinc-900">
          {tab === "tools" && (
            <LogView
              role={role}
              tenantId={tenantId}
              refreshKey={refreshKey}
              onRefreshed={() => setLastUpdatedLabel("just now")}
            />
          )}
          {tab === "crew" && (
            <CrewManager tenantId={tenantId} refreshKey={refreshKey} />
          )}
          {tab === "settings" && (
            <SettingsView tenantId={tenantId} refreshKey={refreshKey} />
          )}
        </div>
      </div>
    </div>
  );
}
