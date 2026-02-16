import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/app/api/auth/route";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

/**
 * Check the auth cookie before serving data.
 */
function isAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get("ttma-auth")?.value ?? "";
  if (!token) return false;
  try {
    return verifyToken(token);
  } catch {
    return false;
  }
}

/**
 * GET /api/dashboard?tab=active|history|users
 * Returns JSON data for the dashboard tables.
 */
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = req.nextUrl.searchParams.get("tab") ?? "active";

  try {
    switch (tab) {
      case "active": {
        const snapshot = await db
          .collection("activeCheckouts")
          .orderBy("checkedOutAt", "desc")
          .get();
        const rows = snapshot.docs.map((doc) => doc.data());
        return NextResponse.json({ rows });
      }

      case "history": {
        const snapshot = await db
          .collection("history")
          .orderBy("returnedAt", "desc")
          .limit(100)
          .get();
        const rows = snapshot.docs.map((doc) => doc.data());
        return NextResponse.json({ rows });
      }

      case "users": {
        const snapshot = await db
          .collection("users")
          .orderBy("registeredAt", "desc")
          .get();
        const rows = snapshot.docs
          .filter((doc) => doc.data().name)
          .map((doc) => doc.data());
        return NextResponse.json({ rows });
      }

      default:
        return NextResponse.json(
          { error: "Invalid tab parameter" },
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
