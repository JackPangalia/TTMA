import { NextRequest, NextResponse } from "next/server";
import { deleteTool, updateToolGroup } from "@/lib/sheets";
import { getRoleFromRequest } from "@/app/api/auth/route";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tools/[id]
 * Update a tool's group. Admin only.
 * Body: { tenantId: string, group: string | null }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const group = body.group === "" || body.group === null ? null : body.group.toString().trim();

    const updated = await updateToolGroup(tenantId, id, group);
    if (!updated) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tool update error:", error);
    return NextResponse.json({ error: "Failed to update tool" }, { status: 500 });
  }
}

/**
 * DELETE /api/tools/[id]?tenantId=xxx
 * Removes a tool from the catalog. Admin only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const role = await getRoleFromRequest(req, tenantId);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Tool ID is required" },
        { status: 400 }
      );
    }

    await deleteTool(tenantId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}
