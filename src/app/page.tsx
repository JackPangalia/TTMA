import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-lg text-center">
        {/* Logo / title */}
        <div className="mb-8">
          <span className="text-5xl">🔧</span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">TTMA</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Trades Tool Management App
          </p>
        </div>

        {/* Description */}
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          A WhatsApp bot that helps trades teams track tools on job sites.
          Workers check tools in and out by sending a simple text message — no
          app download, no login required.
        </p>

        {/* How it works */}
        <div className="mt-10 grid gap-4 text-left">
          <Feature
            icon="📤"
            title="Check out"
            example={`"grabbed the Dewalt Drill"`}
          />
          <Feature
            icon="📥"
            title="Return"
            example={`"bringing back the Circular Saw"`}
          />
          <Feature
            icon="🔍"
            title="Status"
            example={`"who has the ladder?"`}
          />
        </div>

        {/* Status badge */}
        <div className="mt-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Bot is running
          </span>
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  example,
}: {
  icon: string;
  title: string;
  example: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-500">{example}</p>
      </div>
    </div>
  );
}
