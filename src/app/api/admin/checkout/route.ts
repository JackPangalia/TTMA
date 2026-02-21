import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "@/app/api/auth/route";
import { checkoutTool } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/checkout
 * Admin manually checks out a tool on behalf of a worker.
 * Body: { tenantId: string, tool: string, person: string, phone: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = (body.tenantId ?? "").toString().trim();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const role = await getRoleFromRequest(req, tenantId);
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const tool = (body.tool ?? "").toString().trim();
    const person = (body.person ?? "").toString().trim();
    const phone = (body.phone ?? "").toString().trim();

    if (!tool || !person || !phone) {
      return NextResponse.json(
        { error: "tool, person, and phone are all required" },
        { status: 400 }
      );
    }

    await checkoutTool(tenantId, tool, person, phone, null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin checkout error:", error);
    return NextResponse.json({ error: "Failed to check out tool" }, { status: 500 });
  }
}
