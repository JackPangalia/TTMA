import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact
 * Saves a contact form submission to Firestore.
 * Body: { company: string, name: string, email: string, message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company = (body.company ?? "").toString().trim();
    const name = (body.name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim();
    const message = (body.message ?? "").toString().trim();

    if (!company || !name || !email) {
      return NextResponse.json(
        { error: "Company, name, and email are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    await db.collection("contactSubmissions").add({
      company,
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Try again." },
      { status: 500 }
    );
  }
}
