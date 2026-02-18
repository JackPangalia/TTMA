import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

export type Role = "admin" | "worker";

function generateToken(role: Role): string {
  const secret = role === "admin" ? ADMIN_PASSWORD : DASHBOARD_PASSWORD;
  return crypto
    .createHmac("sha256", secret)
    .update(`ttma-${role}`)
    .digest("hex");
}

/**
 * Determine the role encoded in a cookie token.
 * Returns null if the token doesn't match either role.
 */
export function verifyRole(token: string): Role | null {
  if (!token) return null;

  if (ADMIN_PASSWORD) {
    const adminToken = generateToken("admin");
    if (
      token.length === adminToken.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(adminToken))
    ) {
      return "admin";
    }
  }

  if (DASHBOARD_PASSWORD) {
    const workerToken = generateToken("worker");
    if (
      token.length === workerToken.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(workerToken))
    ) {
      return "worker";
    }
  }

  return null;
}

/**
 * Read the role from the request cookie. Returns null if not authenticated.
 */
export function getRoleFromRequest(req: NextRequest): Role | null {
  const token = req.cookies.get("ttma-auth")?.value ?? "";
  return verifyRole(token);
}

/**
 * POST /api/auth
 * Accepts { password: string }.
 * Checks against ADMIN_PASSWORD first, then DASHBOARD_PASSWORD.
 * Sets a cookie with the matching role on success.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password ?? "";

    if (!DASHBOARD_PASSWORD && !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "No passwords configured" },
        { status: 500 }
      );
    }

    let role: Role | null = null;

    if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
      role = "admin";
    } else if (DASHBOARD_PASSWORD && password === DASHBOARD_PASSWORD) {
      role = "worker";
    }

    if (!role) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const token = generateToken(role);

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set("ttma-auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

/**
 * GET /api/auth
 * Returns the current role from the cookie, or 401 if not authenticated.
 */
export async function GET(req: NextRequest) {
  const role = getRoleFromRequest(req);
  if (!role) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ role });
}
