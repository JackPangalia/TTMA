import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";

/**
 * Generate a simple HMAC token from the password.
 * This is stored as a cookie to keep the user logged in.
 */
function generateToken(): string {
  return crypto
    .createHmac("sha256", DASHBOARD_PASSWORD)
    .update("ttma-dashboard")
    .digest("hex");
}

/**
 * Verify that a token cookie matches the expected value.
 */
export function verifyToken(token: string): boolean {
  if (!DASHBOARD_PASSWORD) return false;
  const expected = generateToken();
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}

/**
 * POST /api/auth
 * Accepts { password: string }, sets a cookie on success.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password ?? "";

    if (!DASHBOARD_PASSWORD) {
      return NextResponse.json(
        { error: "Dashboard password not configured" },
        { status: 500 }
      );
    }

    if (password !== DASHBOARD_PASSWORD) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const token = generateToken();

    const response = NextResponse.json({ ok: true });
    response.cookies.set("ttma-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
