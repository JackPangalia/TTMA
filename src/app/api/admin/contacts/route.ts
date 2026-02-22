import { NextRequest, NextResponse } from "next/server";
import { isSuperAdminRequest } from "@/app/api/auth/route";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/contacts
 * Returns all contact form submissions. Super-admin only.
 */
export async function GET(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await db
      .collection("contactSubmissions")
      .orderBy("createdAt", "desc")
      .get();

    const submissions = snapshot.docs.map((doc) => ({
      id: doc.id,
      company: doc.data().company ?? "",
      name: doc.data().name ?? "",
      email: doc.data().email ?? "",
      message: doc.data().message ?? "",
      createdAt: doc.data().createdAt ?? "",
    }));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Contacts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/contacts?id=xxx
 * Deletes a contact submission. Super-admin only.
 */
export async function DELETE(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!id) {
      return NextResponse.json(
        { error: "Submission ID is required" },
        { status: 400 }
      );
    }

    await db.collection("contactSubmissions").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
