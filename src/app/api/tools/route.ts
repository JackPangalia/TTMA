import { NextRequest, NextResponse } from "next/server";
import { getTools, addTool } from "@/lib/sheets";
import { getRoleFromRequest } from "@/app/api/auth/route";

export const dynamic = "force-dynamic";

/**
 * GET /api/tools
 * Returns all cataloged tools. Accessible by any authenticated user.
 */
export async function GET() {
  try {
    const tools = await getTools();
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
 * Adds a new tool to the catalog. Admin only.
 * Body: { name: string, aliases?: string[] }
 */
export async function POST(req: NextRequest) {
  const role = getRoleFromRequest(req);
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = (body.name ?? "").toString().trim();
    const aliases = Array.isArray(body.aliases)
      ? body.aliases.map((a: unknown) => String(a).trim()).filter(Boolean)
      : undefined;

    if (!name) {
      return NextResponse.json(
        { error: "Tool name is required" },
        { status: 400 }
      );
    }

    const id = await addTool(name, aliases);
    return NextResponse.json({ id, name, aliases: aliases ?? [] });
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Failed to add tool" },
      { status: 500 }
    );
  }
}
