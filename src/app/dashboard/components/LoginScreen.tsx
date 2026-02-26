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
          <h1 className="text-xl font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">TTMA</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Enter crew password</p>
        </div>

        <form onSubmit={handleSubmit} className="border-2 border-zinc-800 bg-white p-5 cel-shadow dark:border-zinc-500 dark:bg-zinc-900">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mb-3 w-full border-2 border-zinc-800 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-900 focus:bg-amber-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:bg-zinc-700"
          />
          {error && (
            <p className="mb-3 border-2 border-red-600 bg-red-100 px-2 py-1.5 text-sm font-bold text-red-600 animate-fade-in dark:border-red-400 dark:bg-red-900/30 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="cel-btn-press w-full border-2 border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white cel-shadow-sm hover:bg-zinc-700 disabled:opacity-40 dark:border-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
