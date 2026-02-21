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
