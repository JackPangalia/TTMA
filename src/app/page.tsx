import { ContactForm } from "@/components/ContactForm";

const STEPS = [
  {
    label: "Check Out",
    example: "grabbed the Dewalt Drill",
    description:
      "Workers text what they're taking. The bot logs it instantly.",
  },
  {
    label: "Return",
    example: "bringing back the Saw",
    description:
      "When they're done, a quick message marks the tool as returned.",
  },
  {
    label: "Status",
    example: "who has the ladder?",
    description:
      "Anyone can ask who has what. The bot replies in seconds.",
  },
];

const VALUE_PROPS = [
  {
    title: "No App Download",
    description:
      "Workers use WhatsApp — already on their phone. Zero onboarding friction.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "Natural Language",
    description:
      "No rigid commands. Workers text like they talk and AI figures out the rest.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.2 48.2 0 0 0 5.024-.138c1.583-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
  },
  {
    title: "Real-Time Dashboard",
    description:
      "Managers see every checkout, return, and who has what — live.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen text-zinc-900">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-sm font-bold uppercase tracking-wider text-zinc-900">
            TTMA
          </span>
          <a
            href="#contact"
            className="inline-flex h-8 items-center border border-zinc-300 bg-zinc-100 px-3 text-[10px] font-medium uppercase tracking-wide text-zinc-600 hover:border-zinc-400 hover:bg-zinc-200 hover:text-zinc-900"
          >
            Contact
          </a>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32">
        <div className="max-w-2xl">
          <p className="animate-fade-in-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Tool Tracking via WhatsApp
          </p>
          <h1 className="animate-fade-in-2 mt-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.15]">
            Stop losing tools on the job site.
          </h1>
          <p className="animate-fade-in-3 mt-5 max-w-lg text-base leading-relaxed text-zinc-500">
            Workers text a WhatsApp number to check tools in and out.
            No app download. No login. Managers see everything on a live dashboard.
          </p>
          <div className="animate-fade-in-4 mt-10">
            <a
              href="#contact"
              className="inline-block bg-zinc-900 px-6 py-3 text-xs font-medium uppercase tracking-wide text-white hover:bg-zinc-800"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="border-y border-zinc-200 bg-zinc-50/60">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            How It Works
          </p>
          <h2 className="mt-2 text-lg font-bold uppercase tracking-wide text-zinc-900">
            Text It. Track It.
          </h2>

          <div className="mt-12">
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className="flex gap-5 border-b border-zinc-200 py-6 last:border-b-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-zinc-200 text-xs font-bold text-zinc-400">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
                    {step.label}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                    {step.description}
                  </p>
                  <p className="mt-2.5 text-xs italic text-zinc-400">
                    &ldquo;{step.example}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value Props — Bento Grid ─────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Why TTMA
        </p>
        <h2 className="mt-2 text-lg font-bold uppercase tracking-wide text-zinc-900">
          Built for the Trades
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:grid-rows-2">
          {/* Hero card — spans 2 cols + 2 rows */}
          <div className="group relative overflow-hidden border border-zinc-200 bg-white p-8 transition-shadow hover:shadow-lg sm:col-span-2 sm:row-span-2">
            <div className="mb-6 flex h-10 w-10 items-center justify-center border border-zinc-200 text-zinc-500">
              {VALUE_PROPS[0].icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
              {VALUE_PROPS[0].title}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
              {VALUE_PROPS[0].description}
            </p>

            {/* Mini WhatsApp chat mockup */}
            <div className="mt-8 max-w-xs">
              <div className="border border-zinc-200 bg-zinc-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center bg-green-600">
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">TTMA Bot</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-fit border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-600">
                    grabbed the Dewalt Drill
                  </div>
                  <div className="w-fit border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700">
                    Got it! Dewalt Drill checked out to you.
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-zinc-100 opacity-0 transition-opacity group-hover:opacity-60" />
          </div>

          {/* Smaller card — Natural Language */}
          <div className="group relative overflow-hidden border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-10 w-10 items-center justify-center border border-zinc-200 text-zinc-500">
              {VALUE_PROPS[1].icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
              {VALUE_PROPS[1].title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {VALUE_PROPS[1].description}
            </p>
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-zinc-100 opacity-0 transition-opacity group-hover:opacity-60" />
          </div>

          {/* Smaller card — Real-Time Dashboard */}
          <div className="group relative overflow-hidden border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-10 w-10 items-center justify-center border border-zinc-200 text-zinc-500">
              {VALUE_PROPS[2].icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
              {VALUE_PROPS[2].title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              {VALUE_PROPS[2].description}
            </p>
            <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-zinc-100 opacity-0 transition-opacity group-hover:opacity-60" />
          </div>
        </div>
      </section>

      {/* ── Contact / Get Started ────────────────────────────────────── */}
      <section
        id="contact"
        className="border-t border-zinc-200 bg-zinc-50/60"
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="grid grid-cols-1 items-start gap-12 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Get Started
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Start your free pilot.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                Tell us about your crew and we&apos;ll set you up in minutes.
                No commitment, no credit card.
              </p>
              <div className="mt-6 space-y-3 text-sm text-zinc-500">
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Set up in under 10 minutes
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Works with any crew size
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Cancel anytime
                </div>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-grid border-t border-zinc-200 bg-zinc-50/40">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                TTMA
              </span>
              <p className="mt-1 text-xs text-zinc-400">
                Tool tracking, simplified.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              <span>&copy; {new Date().getFullYear()}</span>
              <span className="text-zinc-300">/</span>
              <a
                href="https://centonis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium uppercase tracking-wide text-zinc-400 hover:text-zinc-700"
              >
                Centonis
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
