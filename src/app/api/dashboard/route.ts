import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { getTools } from "@/lib/sheets";
import { getRoleFromRequest } from "@/app/api/auth/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard?view=log|users|tools
 *
 * - log:   merges activeCheckouts (status=OUT) and history (status=RETURNED)
 * - users: registered workers
 * - tools: tool catalog (admin only for writes, but readable by all)
 */
export async function GET(req: NextRequest) {
  const role = getRoleFromRequest(req);
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view") ?? "log";

  try {
    switch (view) {
      case "log": {
        const [activeSnap, historySnap] = await Promise.all([
          db.collection("activeCheckouts").orderBy("checkedOutAt", "desc").get(),
          db.collection("history").orderBy("returnedAt", "desc").limit(200).get(),
        ]);

        const activeRows = activeSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            tool: d.tool ?? "",
            person: d.person ?? "",
            phone: d.phone ?? "",
            status: "OUT" as const,
            checkedOutAt: d.checkedOutAt ?? "",
            returnedAt: null,
          };
        });

        const historyRows = historySnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            tool: d.tool ?? "",
            person: d.person ?? "",
            phone: d.phone ?? "",
            status: "RETURNED" as const,
            checkedOutAt: d.checkedOutAt ?? "",
            returnedAt: d.returnedAt ?? "",
          };
        });

        // Active rows first, then history rows.
        const rows = [...activeRows, ...historyRows];
        return NextResponse.json({ rows });
      }

      case "users": {
        const snapshot = await db
          .collection("users")
          .orderBy("registeredAt", "desc")
          .get();
        const rows = snapshot.docs
          .filter((doc) => doc.data().name)
          .map((doc) => ({
            phone: doc.data().phone ?? doc.id,
            name: doc.data().name ?? "",
            registeredAt: doc.data().registeredAt ?? "",
          }));
        return NextResponse.json({ rows });
      }

      case "tools": {
        const tools = await getTools();
        return NextResponse.json({ rows: tools });
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
