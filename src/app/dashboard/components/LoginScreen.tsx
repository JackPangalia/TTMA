"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Role } from "../types";

interface LoginScreenProps {
  tenantId: string;
  onLogin: (role: Role) => void;
}

export function LoginScreen({ tenantId, onLogin }: LoginScreenProps) {
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
        body: JSON.stringify({ password, tenantId }),
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">TTMA</h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Enter crew password</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mb-3 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-accent focus:ring-1 focus:ring-accent-muted dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-accent dark:focus:ring-accent-muted"
          />
          {error && (
            <p className="mb-3 text-sm text-red-500 animate-fade-in">{error}</p>
          )}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full bg-zinc-900 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
