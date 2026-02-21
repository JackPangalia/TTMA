import { db } from "./firebase";
import type { Tenant } from "./types";

const tenantsCol = () => db.collection("tenants");

function now(): string {
  return new Date().toISOString();
}

export async function getTenantByTwilioNumber(
  twilioNumber: string
): Promise<Tenant | null> {
  const snapshot = await tenantsCol()
    .where("twilioNumber", "==", twilioNumber)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return docToTenant(doc);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const doc = await tenantsCol().doc(id).get();
  if (!doc.exists) return null;
  return docToTenant(doc);
}

/**
 * Look up a tenant by its URL slug.
 * The slug is stored as the Firestore doc ID, so this is a direct lookup.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return getTenantById(slug);
}

export async function getAllTenants(): Promise<Tenant[]> {
  const snapshot = await tenantsCol().orderBy("createdAt", "desc").get();
  return snapshot.docs.map(docToTenant);
}

export async function createTenant(
  data: Omit<Tenant, "id" | "createdAt">
): Promise<string> {
  const slug = data.slug.toLowerCase().trim();

  const existing = await tenantsCol().doc(slug).get();
  if (existing.exists) {
    throw new Error("Slug already in use");
  }

  await tenantsCol().doc(slug).set({
    slug,
    name: data.name.trim(),
    twilioNumber: data.twilioNumber.trim(),
    adminPassword: data.adminPassword,
    dashboardPassword: data.dashboardPassword,
    groupsEnabled: data.groupsEnabled,
    groupNames: data.groupNames,
    status: data.status,
    createdAt: now(),
  });
  return slug;
}

export async function updateTenant(
  id: string,
  data: Partial<Omit<Tenant, "id" | "createdAt">>
): Promise<void> {
  await tenantsCol().doc(id).update(data);
}

export async function deleteTenant(id: string): Promise<void> {
  await tenantsCol().doc(id).delete();
}

function docToTenant(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
): Tenant {
  const d = doc.data()!;
  return {
    id: doc.id,
    slug: d.slug ?? doc.id,
    name: d.name ?? "",
    twilioNumber: d.twilioNumber ?? "",
    adminPassword: d.adminPassword ?? "",
    dashboardPassword: d.dashboardPassword ?? "",
    groupsEnabled: d.groupsEnabled ?? false,
    groupNames: d.groupNames ?? [],
    createdAt: d.createdAt ?? "",
    status: d.status ?? "active",
  };
}
