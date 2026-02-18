import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "@/app/api/auth/route";
import { checkinToolById } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/checkin
 * Admin force-returns a tool by its activeCheckouts doc ID.
 * Body: { id: string }
 */
export async function POST(req: NextRequest) {
  const role = getRoleFromRequest(req);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = (body.id ?? "").toString().trim();

    if (!id) {
      return NextResponse.json({ error: "Checkout ID is required" }, { status: 400 });
    }

    const result = await checkinToolById(id);

    if (!result.found) {
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tool: result.tool, person: result.person });
  } catch (error) {
    console.error("Admin checkin error:", error);
    return NextResponse.json({ error: "Failed to check in tool" }, { status: 500 });
  }
}
