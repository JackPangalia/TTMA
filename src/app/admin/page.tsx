"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Tenant {
  id: string;
  slug: string;
  name: string;
  joinCode: string;
  adminPassword: string;
  dashboardPassword: string;
  groupsEnabled: boolean;
  groupNames: string[];
  createdAt: string;
  status: "active" | "disabled";
}

interface ContactSubmission {
  id: string;
  company: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => {
        if (r.ok) {
          setAuthed(true);
          return r.json();
        }
        return null;
      })
      .then((data) => {
        if (data?.tenants) setTenants(data.tenants);
      })
      .finally(() => setChecking(false));
  }, []);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const res = await fetch("/api/admin/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.submissions ?? []);
      }
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchContacts();
  }, [authed, fetchContacts]);

  async function handleDeleteContact(id: string) {
    if (deletingContactId) return;
    setDeletingContactId(id);
    try {
      const res = await fetch(`/api/admin/contacts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) fetchContacts();
    } finally {
      setDeletingContactId(null);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loginLoading) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      if (res.ok) {
        setAuthed(true);
        fetchTenants();
      } else {
        const data = await res.json();
        setLoginError(data.error || "Incorrect password");
      }
    } catch {
      setLoginError("Connection error");
    } finally {
      setLoginLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-cel-spin border-3 border-zinc-800 border-t-transparent dark:border-zinc-400 dark:border-t-transparent" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              TTMA Admin
            </h1>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Super-admin access
            </p>
          </div>
          <form onSubmit={handleLogin} className="border-2 border-zinc-800 bg-white p-5 cel-shadow dark:border-zinc-500 dark:bg-zinc-900">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mb-3 w-full border-2 border-zinc-800 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:bg-amber-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:bg-zinc-700"
            />
            {loginError && (
              <p className="mb-3 border-2 border-red-600 bg-red-100 px-2 py-1.5 text-sm font-bold text-red-600 animate-fade-in dark:border-red-400 dark:bg-red-900/30 dark:text-red-400">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={!password.trim() || loginLoading}
              className="cel-btn-press w-full border-2 border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white cel-shadow-sm hover:bg-zinc-700 disabled:opacity-40 dark:border-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b-3 border-zinc-800 bg-white dark:border-zinc-600 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              TTMA
            </span>
            <span className="text-sm font-black text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTenants}
              className="cel-btn-press flex h-8 w-8 items-center justify-center border-2 border-zinc-800 bg-white text-zinc-700 cel-shadow-xs hover:bg-amber-100 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              title="Refresh"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
            </button>
            <ThemeToggle />
            <button
              onClick={() => {
                document.cookie = "ttma-superadmin=; path=/; max-age=0";
                setAuthed(false);
              }}
              className="cel-btn-press flex h-8 items-center border-2 border-zinc-800 bg-white px-2.5 text-[10px] font-bold uppercase tracking-wide text-zinc-700 cel-shadow-xs hover:bg-amber-100 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Tenants{" "}
            {tenants.length > 0 && (
              <span className="ml-1 border-2 border-zinc-800 bg-zinc-100 px-1.5 py-0.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {tenants.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setEditingId(null);
            }}
            className="cel-btn-press border-2 border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white cel-shadow-sm hover:bg-zinc-700 dark:border-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {showCreate ? "Cancel" : "Add Tenant"}
          </button>
        </div>

        {showCreate && (
          <CreateTenantForm
            onCreated={() => {
              setShowCreate(false);
              fetchTenants();
            }}
          />
        )}

        {loading && tenants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-cel-spin border-3 border-zinc-800 border-t-transparent dark:border-zinc-400 dark:border-t-transparent" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="border-2 border-zinc-800 bg-white px-4 py-8 text-center text-sm font-medium text-zinc-500 cel-shadow dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            No tenants yet. Create your first one.
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((t) => (
              <TenantRow
                key={t.id}
                tenant={t}
                expanded={editingId === t.id}
                onToggle={() => setEditingId(editingId === t.id ? null : t.id)}
                onUpdated={fetchTenants}
              />
            ))}
          </div>
        )}

        {/* Contact submissions */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Contact Submissions{" "}
              {contacts.length > 0 && (
                <span className="ml-1 border-2 border-zinc-800 bg-zinc-100 px-1.5 py-0.5 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {contacts.length}
                </span>
              )}
            </h2>
            <button
              onClick={fetchContacts}
              disabled={contactsLoading}
              className="cel-btn-press text-[10px] font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:hover:text-zinc-200"
            >
              {contactsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {contactsLoading && contacts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-cel-spin border-3 border-zinc-800 border-t-transparent dark:border-zinc-400 dark:border-t-transparent" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="border-2 border-zinc-800 bg-white px-4 py-8 text-center text-sm font-medium text-zinc-500 cel-shadow dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              No contact submissions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="border-2 border-zinc-800 bg-white px-4 py-3 cel-shadow dark:border-zinc-600 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {c.company}
                        </p>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {c.name}
                        </span>
                        <a
                          href={`mailto:${c.email}`}
                          className="text-xs font-medium text-zinc-500 underline decoration-2 decoration-zinc-300 hover:text-zinc-800 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-200"
                        >
                          {c.email}
                        </a>
                      </div>
                      {c.message && (
                        <p className="mt-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {c.message}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-600">
                        {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(c.id)}
                      disabled={deletingContactId === c.id}
                      className="cel-btn-press shrink-0 border-2 border-zinc-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400 hover:border-red-600 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:border-zinc-600 dark:hover:border-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    >
                      {deletingContactId === c.id ? "..." : "Dismiss"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Tenant Form ──────────────────────────────────────────────

function CreateTenantForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [adminPw, setAdminPw] = useState("");
  const [dashPw, setDashPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
  }

  function handleJoinCodeChange(value: string) {
    setJoinCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          slug: slug.trim(),
          name: name.trim(),
          joinCode: joinCode.trim(),
          adminPassword: adminPw,
          dashboardPassword: dashPw,
        }),
      });
      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create tenant");
      }
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border-2 border-zinc-800 bg-white px-3 py-2 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:bg-amber-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:bg-zinc-700";
  const labelClass =
    "block text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1";

  return (
    <div className="mb-4 border-2 border-zinc-800 bg-white p-4 cel-shadow dark:border-zinc-600 dark:bg-zinc-900">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Construction"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>URL Slug</label>
            <div className="flex items-center gap-0">
              <span className="border-2 border-r-0 border-zinc-800 bg-zinc-100 px-2 py-2 text-xs font-bold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500">
                /dashboard/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="acme-construction"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Join Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => handleJoinCodeChange(e.target.value)}
              placeholder="ACME"
              className={inputClass}
            />
            <p className="mt-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
              Workers text this code to join via WhatsApp
            </p>
          </div>
          <div className="hidden sm:block" />
          <div>
            <label className={labelClass}>Admin Password</label>
            <input
              type="text"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Strong password"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dashboard Password</label>
            <input
              type="text"
              value={dashPw}
              onChange={(e) => setDashPw(e.target.value)}
              placeholder="Crew password"
              className={inputClass}
            />
          </div>
        </div>
        {error && <p className="border-2 border-red-600 bg-red-100 px-2 py-1.5 text-sm font-bold text-red-600 dark:border-red-400 dark:bg-red-900/30 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!name.trim() || !slug.trim() || !joinCode.trim() || !adminPw || !dashPw || saving}
          className="cel-btn-press border-2 border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white cel-shadow-sm hover:bg-zinc-700 disabled:opacity-40 dark:border-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Creating..." : "Create Tenant"}
        </button>
      </form>
    </div>
  );
}

// ── Tenant Row ──────────────────────────────────────────────────────

function TenantRow({
  tenant,
  expanded,
  onToggle,
  onUpdated,
}: {
  tenant: Tenant;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: () => void;
}) {
  return (
    <div className="border-2 border-zinc-800 bg-white cel-shadow dark:border-zinc-600 dark:bg-zinc-900">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-amber-50 dark:hover:bg-zinc-800/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {tenant.name}
              </p>
              {tenant.joinCode && (
                <span className="border-2 border-zinc-800 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {tenant.joinCode}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              /dashboard/{tenant.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              tenant.status === "active"
                ? "border-emerald-600 bg-emerald-100 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "border-zinc-400 bg-zinc-200 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500"
            }`}
          >
            {tenant.status}
          </span>
          <svg
            className={`h-4 w-4 text-zinc-600 transition-transform dark:text-zinc-400 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {expanded && (
        <TenantEditPanel tenant={tenant} onUpdated={onUpdated} />
      )}
    </div>
  );
}

// ── Edit Panel ──────────────────────────────────────────────────────

function TenantEditPanel({
  tenant,
  onUpdated,
}: {
  tenant: Tenant;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [joinCode, setJoinCode] = useState(tenant.joinCode);
  const [adminPw, setAdminPw] = useState(tenant.adminPassword);
  const [dashPw, setDashPw] = useState(tenant.dashboardPassword);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
  }

  function handleJoinCodeChange(value: string) {
    setJoinCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
  }

  const dashboardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/${slug}`
      : `/dashboard/${slug}`;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tenant.id,
          slug: slug.trim(),
          name: name.trim(),
          joinCode: joinCode.trim(),
          adminPassword: adminPw,
          dashboardPassword: dashPw,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onUpdated();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    setSaving(true);
    try {
      await fetch("/api/admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tenant.id,
          status: tenant.status === "active" ? "disabled" : "active",
        }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tenants?id=${encodeURIComponent(tenant.id)}`, {
        method: "DELETE",
      });
      if (res.ok) onUpdated();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const inputClass =
    "w-full border-2 border-zinc-800 bg-white px-3 py-2 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:bg-amber-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:bg-zinc-700";
  const labelClass =
    "block text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1";

  return (
    <div className="border-t-2 border-zinc-800 px-4 py-4 dark:border-zinc-600">
      <div className="mb-3">
        <label className={labelClass}>Dashboard Link</label>
        <div className="flex gap-2">
          <input
            ref={linkRef}
            type="text"
            readOnly
            value={dashboardUrl}
            className={`${inputClass} bg-zinc-50 dark:bg-zinc-800/50`}
            onClick={() => linkRef.current?.select()}
          />
          <button
            onClick={() => navigator.clipboard.writeText(dashboardUrl)}
            className="cel-btn-press shrink-0 border-2 border-zinc-800 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-700 cel-shadow-xs hover:bg-amber-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Company Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>URL Slug</label>
          <div className="flex items-center gap-0">
            <span className="border-2 border-r-0 border-zinc-800 bg-zinc-100 px-2 py-2 text-xs font-bold text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-500">
              /dashboard/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Join Code</label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => handleJoinCodeChange(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
            Workers text this code to join via WhatsApp
          </p>
        </div>
        <div className="hidden sm:block" />
        <div>
          <label className={labelClass}>Admin Password</label>
          <input
            type="text"
            value={adminPw}
            onChange={(e) => setAdminPw(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Dashboard Password</label>
          <input
            type="text"
            value={dashPw}
            onChange={(e) => setDashPw(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-3 text-xs font-bold text-zinc-400 dark:text-zinc-500">
        Created {formatDate(tenant.createdAt)}
        {tenant.groupsEnabled && (
          <span className="ml-2">
            Groups: {tenant.groupNames.join(", ") || "none configured"}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !slug.trim()}
            className="cel-btn-press border-2 border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white cel-shadow-sm hover:bg-zinc-700 disabled:opacity-40 dark:border-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleToggleStatus}
            disabled={saving}
            className={`cel-btn-press border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-40 ${
              tenant.status === "active"
                ? "border-red-600 text-red-600 hover:bg-red-100 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500/10"
                : "border-emerald-600 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            }`}
          >
            {tenant.status === "active" ? "Disable" : "Enable"}
          </button>
          {saved && (
            <span className="border-2 border-emerald-600 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 animate-fade-in dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400">
              Saved!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">Are you sure?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="cel-btn-press border-2 border-red-600 bg-red-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-600 cel-shadow-xs hover:bg-red-200 disabled:opacity-50 dark:border-red-400 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="cel-btn-press px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
