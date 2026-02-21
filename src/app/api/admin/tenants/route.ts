import { NextRequest, NextResponse } from "next/server";
import { isSuperAdminRequest } from "@/app/api/auth/route";
import {
  getAllTenants,
  createTenant,
  updateTenant,
  deleteTenant,
} from "@/lib/tenants";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "";

/**
 * POST /api/admin/tenants — login as super-admin
 * Body: { action: "login", password: string }
 *
 * POST /api/admin/tenants — create tenant
 * Body: { action: "create", name, twilioNumber, adminPassword, dashboardPassword }
 *
 * PATCH /api/admin/tenants
 * Body: { id, ...updates }
 *
 * DELETE /api/admin/tenants?id=xxx
 */

export async function GET(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await getAllTenants();
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("Tenants list error:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action ?? "";

    if (action === "login") {
      const password = body.password ?? "";
      if (!SUPER_ADMIN_PASSWORD || password !== SUPER_ADMIN_PASSWORD) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }

      const token = crypto
        .createHmac("sha256", SUPER_ADMIN_PASSWORD)
        .update("ttma-superadmin")
        .digest("hex");

      const response = NextResponse.json({ ok: true });
      response.cookies.set("ttma-superadmin", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return response;
    }

    if (!isSuperAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "create") {
      const slug = (body.slug ?? "").toString().toLowerCase().trim();
      const name = (body.name ?? "").toString().trim();
      const twilioNumber = (body.twilioNumber ?? "").toString().trim();
      const adminPassword = (body.adminPassword ?? "").toString().trim();
      const dashboardPassword = (body.dashboardPassword ?? "").toString().trim();

      if (!slug || !name || !twilioNumber || !adminPassword || !dashboardPassword) {
        return NextResponse.json(
          { error: "slug, name, twilioNumber, adminPassword, and dashboardPassword are required" },
          { status: 400 }
        );
      }

      if (!/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json(
          { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
          { status: 400 }
        );
      }

      try {
        const id = await createTenant({
          slug,
          name,
          twilioNumber,
          adminPassword,
          dashboardPassword,
          groupsEnabled: false,
          groupNames: [],
          status: "active",
        });
        return NextResponse.json({ ok: true, id });
      } catch (err) {
        if (err instanceof Error && err.message === "Slug already in use") {
          return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
        }
        throw err;
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Tenants API error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = (body.id ?? "").toString().trim();

    if (!id) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.slug !== undefined) updates.slug = body.slug.toString().toLowerCase().trim();
    if (body.name !== undefined) updates.name = body.name;
    if (body.twilioNumber !== undefined) updates.twilioNumber = body.twilioNumber;
    if (body.adminPassword !== undefined) updates.adminPassword = body.adminPassword;
    if (body.dashboardPassword !== undefined) updates.dashboardPassword = body.dashboardPassword;
    if (body.status !== undefined) updates.status = body.status;
    if (typeof body.groupsEnabled === "boolean") updates.groupsEnabled = body.groupsEnabled;
    if (Array.isArray(body.groupNames)) updates.groupNames = body.groupNames;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await updateTenant(id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tenants update error:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!id) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    await deleteTenant(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Tenants delete error:", error);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
