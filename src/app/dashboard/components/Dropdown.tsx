"use client";

import { useState, useRef, useEffect } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Dropdown({
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
  size = "md",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const sizeClasses =
    size === "sm"
      ? "px-2 py-1.5 text-[10px]"
      : "px-3 py-2.5 text-sm";
  const itemSizeClasses =
    size === "sm"
      ? "px-2 py-1.5 text-[10px]"
      : "px-3 py-2 text-sm";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 border-2 border-zinc-800 bg-white font-bold uppercase tracking-wide text-zinc-700 outline-none hover:bg-amber-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 ${sizeClasses}`}
      >
        <span className={selected ? "" : "text-zinc-400 dark:text-zinc-500"}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 text-zinc-600 transition-transform dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-48 w-full min-w-[120px] overflow-y-auto border-2 border-zinc-800 bg-white cel-shadow-sm dark:border-zinc-600 dark:bg-zinc-800">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full text-left font-bold uppercase tracking-wide border-b-2 border-zinc-200 last:border-b-0 dark:border-zinc-700 hover:bg-amber-100 dark:hover:bg-zinc-700 ${itemSizeClasses} ${
                opt.value === value
                  ? "bg-zinc-900 text-white dark:bg-zinc-600 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
