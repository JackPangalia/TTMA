import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "@/app/api/auth/route";
import { deleteUser } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/users?tenantId=xxx&phone=whatsapp:+1234567890
 * Admin-only: removes a registered worker.
 */
export async function DELETE(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const role = await getRoleFromRequest(req, tenantId);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const phone = req.nextUrl.searchParams.get("phone") ?? "";

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    await deleteUser(tenantId, phone);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
