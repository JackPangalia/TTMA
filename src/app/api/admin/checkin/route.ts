import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "@/app/api/auth/route";
import { checkinToolById } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/checkin
 * Admin force-returns a tool by its activeCheckouts doc ID.
 * Body: { id: string, tenantId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = (body.tenantId ?? "").toString().trim();
    const id = (body.id ?? "").toString().trim();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const role = await getRoleFromRequest(req, tenantId);
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json({ error: "Checkout ID is required" }, { status: 400 });
    }

    const result = await checkinToolById(tenantId, id);

    if (!result.found) {
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tool: result.tool, person: result.person });
  } catch (error) {
    console.error("Admin checkin error:", error);
    return NextResponse.json({ error: "Failed to check in tool" }, { status: 500 });
  }
}
