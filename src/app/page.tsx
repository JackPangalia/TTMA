"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm text-center animate-fade-in">
        <h1 className="text-lg font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
          TTMA
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Redirecting...
        </p>
      </div>
    </div>
  );
}
