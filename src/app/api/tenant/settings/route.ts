import { NextRequest, NextResponse } from "next/server";
import { getRoleFromRequest } from "@/app/api/auth/route";
import { getTenantById, updateTenant } from "@/lib/tenants";

export const dynamic = "force-dynamic";

/**
 * GET /api/tenant/settings?tenantId=xxx
 * Returns tenant settings (groups config). Any authenticated user.
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

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    groupsEnabled: tenant.groupsEnabled,
    groupNames: tenant.groupNames,
  });
}

/**
 * PATCH /api/tenant/settings
 * Body: { tenantId: string, groupsEnabled?: boolean, groupNames?: string[] }
 * Admin only.
 */
export async function PATCH(req: NextRequest) {
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

    const updates: Record<string, unknown> = {};
    if (typeof body.groupsEnabled === "boolean") {
      updates.groupsEnabled = body.groupsEnabled;
    }
    if (Array.isArray(body.groupNames)) {
      updates.groupNames = body.groupNames
        .map((g: unknown) => String(g).trim())
        .filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await updateTenant(tenantId, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tenant settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
