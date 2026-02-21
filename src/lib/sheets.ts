import { db } from "./firebase";
import type { User, ActiveCheckout, Tool } from "./types";

// ── Collection references ───────────────────────────────────────────

const usersCol = () => db.collection("users");
const activeCol = () => db.collection("activeCheckouts");
const historyCol = () => db.collection("history");
const toolsCol = () => db.collection("tools");
const conversationsCol = () => db.collection("conversations");

// ── Helpers ─────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ── Users ───────────────────────────────────────────────────────────

export async function getUser(
  tenantId: string,
  phone: string
): Promise<User | null> {
  const doc = await usersCol().doc(`${tenantId}_${phone}`).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    phone: data.phone,
    name: data.name ?? "",
    group: data.group ?? null,
    tenantId: data.tenantId,
    registeredAt: data.registeredAt,
  };
}

export async function createPendingUser(
  tenantId: string,
  phone: string
): Promise<void> {
  await usersCol().doc(`${tenantId}_${phone}`).set({
    phone,
    name: "",
    group: null,
    tenantId,
    registeredAt: now(),
  });
}

export async function registerUser(
  tenantId: string,
  phone: string,
  name: string
): Promise<void> {
  await usersCol().doc(`${tenantId}_${phone}`).update({
    name,
    registeredAt: now(),
  });
}

export async function setUserGroup(
  tenantId: string,
  phone: string,
  group: string
): Promise<void> {
  await usersCol().doc(`${tenantId}_${phone}`).update({ group });
}

// ── Tool check-out ──────────────────────────────────────────────────

export async function checkoutTool(
  tenantId: string,
  tool: string,
  person: string,
  phone: string,
  group: string | null
): Promise<void> {
  await activeCol().add({
    tool,
    person,
    phone,
    group,
    tenantId,
    checkedOutAt: now(),
  });
}

// ── Tool check-in ───────────────────────────────────────────────────

export async function checkinTool(
  tenantId: string,
  tool: string,
  phone: string
): Promise<{ found: boolean; person?: string }> {
  const snapshot = await activeCol()
    .where("tenantId", "==", tenantId)
    .where("phone", "==", phone)
    .get();

  const match = snapshot.docs.find(
    (doc) => doc.data().tool.toLowerCase() === tool.toLowerCase()
  );

  if (!match) {
    return { found: false };
  }

  const data = match.data();

  await historyCol().add({
    tool: data.tool,
    person: data.person,
    phone: data.phone,
    group: data.group ?? null,
    tenantId,
    checkedOutAt: data.checkedOutAt,
    returnedAt: now(),
  });

  await activeCol().doc(match.id).delete();

  return { found: true, person: data.person };
}

// ── Tools catalog ───────────────────────────────────────────────────

export async function getTools(tenantId: string): Promise<Tool[]> {
  const snapshot = await toolsCol()
    .where("tenantId", "==", tenantId)
    .get();
  const tools = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name ?? "",
      aliases: d.aliases ?? [],
      group: d.group ?? null,
      tenantId: d.tenantId,
      createdAt: d.createdAt ?? "",
    };
  });
  return tools.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addTool(
  tenantId: string,
  name: string,
  aliases?: string[],
  group?: string | null
): Promise<string> {
  const ref = await toolsCol().add({
    name: name.trim(),
    aliases: aliases ?? [],
    group: group ?? null,
    tenantId,
    createdAt: now(),
  });
  return ref.id;
}

export async function updateToolGroup(
  tenantId: string,
  id: string,
  group: string | null
): Promise<boolean> {
  const doc = await toolsCol().doc(id).get();
  if (!doc.exists || doc.data()?.tenantId !== tenantId) return false;
  await toolsCol().doc(id).update({ group });
  return true;
}

export async function deleteTool(
  tenantId: string,
  id: string
): Promise<void> {
  const doc = await toolsCol().doc(id).get();
  if (doc.exists && doc.data()?.tenantId === tenantId) {
    await toolsCol().doc(id).delete();
  }
}

// ── Admin: force check-in by doc ID ─────────────────────────────────

export async function checkinToolById(
  tenantId: string,
  docId: string
): Promise<{ found: boolean; tool?: string; person?: string }> {
  const ref = activeCol().doc(docId);
  const doc = await ref.get();

  if (!doc.exists || doc.data()?.tenantId !== tenantId) {
    return { found: false };
  }

  const data = doc.data()!;

  await historyCol().add({
    tool: data.tool,
    person: data.person,
    phone: data.phone,
    group: data.group ?? null,
    tenantId,
    checkedOutAt: data.checkedOutAt,
    returnedAt: now(),
  });

  await ref.delete();

  return { found: true, tool: data.tool, person: data.person };
}

// ── Admin: delete user ──────────────────────────────────────────────

export async function deleteUser(
  tenantId: string,
  phone: string
): Promise<void> {
  await usersCol().doc(`${tenantId}_${phone}`).delete();
}

// ── Queries ─────────────────────────────────────────────────────────

export async function getActiveCheckouts(
  tenantId: string
): Promise<ActiveCheckout[]> {
  const snapshot = await activeCol()
    .where("tenantId", "==", tenantId)
    .get();

  const checkouts = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      tool: d.tool,
      person: d.person,
      phone: d.phone,
      group: d.group ?? null,
      tenantId: d.tenantId,
      checkedOutAt: d.checkedOutAt,
    };
  });
  return checkouts.sort((a, b) => b.checkedOutAt.localeCompare(a.checkedOutAt));
}

export async function getToolStatus(
  tenantId: string,
  toolName: string
): Promise<ActiveCheckout[]> {
  const all = await getActiveCheckouts(tenantId);
  const query = toolName.toLowerCase();
  return all.filter((c) => c.tool.toLowerCase().includes(query));
}

export async function getToolsByPhone(
  tenantId: string,
  phone: string
): Promise<ActiveCheckout[]> {
  const snapshot = await activeCol()
    .where("tenantId", "==", tenantId)
    .where("phone", "==", phone)
    .get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      tool: d.tool,
      person: d.person,
      phone: d.phone,
      group: d.group ?? null,
      tenantId: d.tenantId,
      checkedOutAt: d.checkedOutAt,
    };
  });
}

// ── Conversation history ────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function saveMessage(
  tenantId: string,
  phone: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await conversationsCol()
    .doc(`${tenantId}_${phone}`)
    .collection("messages")
    .add({
      role,
      content,
      timestamp: now(),
    });
}

export async function getRecentMessages(
  tenantId: string,
  phone: string,
  limit = 6
): Promise<ChatMessage[]> {
  const snapshot = await conversationsCol()
    .doc(`${tenantId}_${phone}`)
    .collection("messages")
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  const messages = snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      role: d.role as "user" | "assistant",
      content: d.content,
      timestamp: d.timestamp,
    };
  });

  return messages.reverse();
}
