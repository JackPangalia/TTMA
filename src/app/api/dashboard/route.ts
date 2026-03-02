import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getRoleFromRequest } from "@/app/api/auth/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard?tenantId=xxx&view=log|users|tools
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const role = await getRoleFromRequest(req, tenantId);
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view") ?? "log";

  try {
    switch (view) {
      case "stats": {
        const [toolsSnap, activeSnap, usersSnap, historySnap] = await Promise.all([
          db.collection("tools").where("tenantId", "==", tenantId).get(),
          db.collection("activeCheckouts").where("tenantId", "==", tenantId).get(),
          db.collection("users").where("tenantId", "==", tenantId).get(),
          db.collection("history").where("tenantId", "==", tenantId).get(),
        ]);

        const totalTools = toolsSnap.size;
        const toolsOut = activeSnap.size;
        const registeredCrew = usersSnap.docs.filter((doc) => doc.data().name).length;

        // ── Tool usage (count + durations from history + active) ──
        const toolStats = new Map<string, { count: number; durations: number[] }>();
        function addToolEvent(name: string, durationMs?: number) {
          const trimmed = name.trim();
          if (!trimmed) return;
          const entry = toolStats.get(trimmed) ?? { count: 0, durations: [] };
          entry.count++;
          if (durationMs && durationMs > 0) entry.durations.push(durationMs);
          toolStats.set(trimmed, entry);
        }
        for (const doc of historySnap.docs) {
          const d = doc.data();
          const ms = d.checkedOutAt && d.returnedAt
            ? new Date(d.returnedAt).getTime() - new Date(d.checkedOutAt).getTime()
            : undefined;
          addToolEvent(d.tool ?? "", ms);
        }
        for (const doc of activeSnap.docs) {
          const d = doc.data();
          const ms = d.checkedOutAt
            ? Date.now() - new Date(d.checkedOutAt).getTime()
            : undefined;
          addToolEvent(d.tool ?? "", ms);
        }
        const toolUsage = Array.from(toolStats.entries())
          .map(([name, s]) => {
            const avgMs = s.durations.length > 0
              ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
              : 0;
            const totalMs = s.durations.length > 0
              ? Math.round(s.durations.reduce((a, b) => a + b, 0))
              : 0;
            return { name, count: s.count, avgMs, totalMs };
          })
          .sort((a, b) => b.totalMs - a.totalMs);

        // ── Activity over time (last 14 days) ──
        const now = Date.now();
        const dayMs = 86400000;
        const activityDays: { date: string; out: number; in: number }[] = [];
        for (let i = 13; i >= 0; i--) {
          const dayStart = new Date(now - i * dayMs);
          dayStart.setHours(0, 0, 0, 0);
          const label = dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          activityDays.push({ date: label, out: 0, in: 0 });
        }

        function dayIndex(isoDate: string): number {
          try {
            const ts = new Date(isoDate).getTime();
            const daysAgo = Math.floor((now - ts) / dayMs);
            return daysAgo <= 13 ? 13 - daysAgo : -1;
          } catch {
            return -1;
          }
        }

        for (const doc of historySnap.docs) {
          const d = doc.data();
          const coIdx = dayIndex(d.checkedOutAt ?? "");
          if (coIdx >= 0) activityDays[coIdx].out++;
          const riIdx = dayIndex(d.returnedAt ?? "");
          if (riIdx >= 0) activityDays[riIdx].in++;
        }
        for (const doc of activeSnap.docs) {
          const coIdx = dayIndex(doc.data().checkedOutAt ?? "");
          if (coIdx >= 0) activityDays[coIdx].out++;
        }

        // ── Top crew members (by total checkouts) ──
        const crewFreq = new Map<string, { name: string; count: number }>();
        for (const doc of historySnap.docs) {
          const d = doc.data();
          const person = (d.person ?? "").trim();
          if (person) {
            const existing = crewFreq.get(person);
            crewFreq.set(person, { name: person, count: (existing?.count ?? 0) + 1 });
          }
        }
        for (const doc of activeSnap.docs) {
          const d = doc.data();
          const person = (d.person ?? "").trim();
          if (person) {
            const existing = crewFreq.get(person);
            crewFreq.set(person, { name: person, count: (existing?.count ?? 0) + 1 });
          }
        }
        const topCrew = Array.from(crewFreq.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // ── Average checkout duration (from completed history) ──
        const durations: number[] = [];
        for (const doc of historySnap.docs) {
          const d = doc.data();
          if (d.checkedOutAt && d.returnedAt) {
            const ms = new Date(d.returnedAt).getTime() - new Date(d.checkedOutAt).getTime();
            if (ms > 0) durations.push(ms);
          }
        }
        const avgDurationMs = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

        return NextResponse.json({
          stats: {
            totalTools,
            toolsOut,
            registeredCrew,
            totalCheckouts: historySnap.size + activeSnap.size,
            toolUsage,
            activityDays,
            topCrew,
            avgDurationMs,
          },
        });
      }

      case "log": {
        const [activeSnap, toolsSnap] = await Promise.all([
          db.collection("activeCheckouts")
            .where("tenantId", "==", tenantId)
            .get(),
          db.collection("tools")
            .where("tenantId", "==", tenantId)
            .get(),
        ]);

        const toolMap = new Map<string, { id: string; group: string | null }>();
        for (const doc of toolsSnap.docs) {
          const d = doc.data();
          toolMap.set((d.name ?? "").toLowerCase(), { id: doc.id, group: d.group ?? null });
        }

        const checkedOutNames = new Set<string>();
        const activeRows = activeSnap.docs.map((doc) => {
          const d = doc.data();
          const toolName = d.tool ?? "";
          checkedOutNames.add(toolName.toLowerCase());
          const catalogEntry = toolMap.get(toolName.toLowerCase());
          return {
            id: doc.id,
            toolId: catalogEntry?.id ?? null,
            tool: toolName,
            person: d.person ?? "",
            phone: d.phone ?? "",
            group: catalogEntry?.group ?? d.group ?? null,
            status: "OUT" as const,
            checkedOutAt: d.checkedOutAt ?? "",
          };
        });

        const availableRows = toolsSnap.docs
          .filter((doc) => !checkedOutNames.has((doc.data().name ?? "").toLowerCase()))
          .map((doc) => {
            const d = doc.data();
            return {
              id: `tool_${doc.id}`,
              toolId: doc.id,
              tool: d.name ?? "",
              person: "",
              phone: "",
              group: d.group ?? null,
              status: "AVAILABLE" as const,
              checkedOutAt: "",
            };
          });

        activeRows.sort((a, b) => b.checkedOutAt.localeCompare(a.checkedOutAt));
        const rows = [...activeRows, ...availableRows];
        return NextResponse.json({ rows });
      }

      case "users": {
        const snapshot = await db
          .collection("users")
          .where("tenantId", "==", tenantId)
          .get();
        const rows = snapshot.docs
          .filter((doc) => doc.data().name)
          .map((doc) => ({
            phone: doc.data().phone ?? doc.id,
            name: doc.data().name ?? "",
            group: doc.data().group ?? null,
            registeredAt: doc.data().registeredAt ?? "",
          }))
          .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
        return NextResponse.json({ rows });
      }

      default:
        return NextResponse.json(
          { error: "Invalid view parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
