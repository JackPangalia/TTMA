import { NextRequest, NextResponse } from "next/server";
import { deleteTool } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/tools/[id]
 * Removes a tool from the catalog.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Tool ID is required" },
        { status: 400 }
      );
    }

    await deleteTool(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tools API error:", error);
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    );
  }
}
