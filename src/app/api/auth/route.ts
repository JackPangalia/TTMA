import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getTenantById } from "@/lib/tenants";

export type Role = "admin" | "worker";

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "";

function generateToken(role: Role, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`ttma-${role}`)
    .digest("hex");
}

/**
 * Determine the role encoded in a cookie token for a given tenant.
 */
export async function verifyRoleForTenant(
  token: string,
  tenantId: string
): Promise<Role | null> {
  if (!token || !tenantId) return null;

  const tenant = await getTenantById(tenantId);
  if (!tenant || tenant.status !== "active") return null;

  if (tenant.adminPassword) {
    const adminToken = generateToken("admin", tenant.adminPassword);
    if (
      token.length === adminToken.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(adminToken))
    ) {
      return "admin";
    }
  }

  if (tenant.dashboardPassword) {
    const workerToken = generateToken("worker", tenant.dashboardPassword);
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
 * Read the role from the request cookie for a given tenant.
 */
export async function getRoleFromRequest(
  req: NextRequest,
  tenantId: string
): Promise<Role | null> {
  const token = req.cookies.get("ttma-auth")?.value ?? "";
  return verifyRoleForTenant(token, tenantId);
}

/**
 * Verify the super-admin token from cookie.
 */
export function verifySuperAdmin(token: string): boolean {
  if (!token || !SUPER_ADMIN_PASSWORD) return false;
  const expected = crypto
    .createHmac("sha256", SUPER_ADMIN_PASSWORD)
    .update("ttma-superadmin")
    .digest("hex");
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function isSuperAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get("ttma-superadmin")?.value ?? "";
  return verifySuperAdmin(token);
}

/**
 * POST /api/auth
 * Accepts { password: string, tenantId: string }.
 * Checks against the tenant's admin and dashboard passwords.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body.password ?? "";
    const tenantId = body.tenantId ?? "";

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant || tenant.status !== "active") {
      return NextResponse.json(
        { error: "Invalid tenant" },
        { status: 404 }
      );
    }

    let role: Role | null = null;

    if (tenant.adminPassword && password === tenant.adminPassword) {
      role = "admin";
    } else if (tenant.dashboardPassword && password === tenant.dashboardPassword) {
      role = "worker";
    }

    if (!role) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const secret = role === "admin" ? tenant.adminPassword : tenant.dashboardPassword;
    const token = generateToken(role, secret);

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
 * GET /api/auth?tenantId=xxx
 * Returns the current role from the cookie for the given tenant.
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? "";
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const role = await getRoleFromRequest(req, tenantId);
  if (!role) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ role });
}
