import { NextRequest, NextResponse } from "next/server";
import { getTools, addTool } from "@/lib/sheets";
import { getRoleFromRequest } from "@/app/api/auth/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/tools?tenantId=xxx
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  try {
    const tools = await getTools(tenantId);
    return NextResponse.json({ tools });
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tools
 * Body: { tenantId: string, name: string, aliases?: string[] }
 * Admin only.
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

    const name = (body.name ?? "").toString().trim();
    const aliases = Array.isArray(body.aliases)
      ? body.aliases.map((a: unknown) => String(a).trim()).filter(Boolean)
      : undefined;
    const group = body.group ? body.group.toString().trim() : null;

    if (!name) {
      return NextResponse.json(
        { error: "Tool name is required" },
        { status: 400 }
      );
    }

    const id = await addTool(tenantId, name, aliases, group);
    return NextResponse.json({ id, name, aliases: aliases ?? [], group });
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Failed to add tool" },
      { status: 500 }
    );
  }
}
