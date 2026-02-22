"use client";

import { useState } from "react";

export function ContactForm() {
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !company.trim() || !name.trim() || !email.trim()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setError("Connection error. Try again.");
    } finally {
      setSending(false);
    }
  }

  const inputClass =
    "w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-300";
  const labelClass =
    "block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5";

  if (sent) {
    return (
      <div className="animate-fade-in border border-zinc-200 bg-white px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-emerald-200 bg-emerald-50">
          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-900">
          Got it. We&apos;ll be in touch.
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          We&apos;ll reach out to set up your pilot.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Company Name</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Construction"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@acme.com"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your crew size, number of tools, etc."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500 animate-fade-in">{error}</p>
      )}

      <button
        type="submit"
        disabled={!company.trim() || !name.trim() || !email.trim() || sending}
        className="mt-5 w-full bg-zinc-900 px-5 py-3 text-xs font-medium uppercase tracking-wide text-white hover:bg-zinc-800 disabled:opacity-40 sm:w-auto"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
