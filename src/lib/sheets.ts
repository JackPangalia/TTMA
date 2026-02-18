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

/**
 * Look up a user by their WhatsApp phone number.
 * Returns the User if found, or null if not registered.
 * A doc with an empty name means registration is pending.
 */
export async function getUser(phone: string): Promise<User | null> {
  const doc = await usersCol().doc(phone).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  return {
    phone: data.phone,
    name: data.name ?? "",
    registeredAt: data.registeredAt,
  };
}

/**
 * Create a pending-registration doc (phone only, no name yet).
 * Called when an unrecognised phone number messages the bot.
 */
export async function createPendingUser(phone: string): Promise<void> {
  await usersCol().doc(phone).set({
    phone,
    name: "",
    registeredAt: now(),
  });
}

/**
 * Complete registration by filling in the user's name.
 */
export async function registerUser(
  phone: string,
  name: string
): Promise<void> {
  await usersCol().doc(phone).update({
    name,
    registeredAt: now(),
  });
}

// ── Tool check-out ──────────────────────────────────────────────────

/**
 * Record a tool being checked out by a worker.
 */
export async function checkoutTool(
  tool: string,
  person: string,
  phone: string
): Promise<void> {
  await activeCol().add({
    tool,
    person,
    phone,
    checkedOutAt: now(),
  });
}

// ── Tool check-in ───────────────────────────────────────────────────

/**
 * Record a tool being returned.
 * Finds the matching doc in activeCheckouts, moves it to history
 * with a returnedAt timestamp, then deletes it from activeCheckouts.
 *
 * Returns true if a matching checkout was found, false otherwise.
 */
export async function checkinTool(
  tool: string,
  phone: string
): Promise<{ found: boolean; person?: string }> {
  // Query for this phone + tool (case-insensitive handled by lowercasing both sides).
  const snapshot = await activeCol().where("phone", "==", phone).get();

  const match = snapshot.docs.find(
    (doc) => doc.data().tool.toLowerCase() === tool.toLowerCase()
  );

  if (!match) {
    return { found: false };
  }

  const data = match.data();

  // 1. Add to history with return timestamp.
  await historyCol().add({
    tool: data.tool,
    person: data.person,
    phone: data.phone,
    checkedOutAt: data.checkedOutAt,
    returnedAt: now(),
  });

  // 2. Delete from activeCheckouts.
  await activeCol().doc(match.id).delete();

  return { found: true, person: data.person };
}

// ── Tools catalog ───────────────────────────────────────────────────

/**
 * Get all cataloged tools.
 */
export async function getTools(): Promise<Tool[]> {
  const snapshot = await toolsCol().orderBy("createdAt", "asc").get();
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name ?? "",
      aliases: d.aliases ?? [],
      createdAt: d.createdAt ?? "",
    };
  });
}

/**
 * Add a tool to the catalog.
 * Returns the new tool's Firestore document ID.
 */
export async function addTool(name: string, aliases?: string[]): Promise<string> {
  const ref = await toolsCol().add({
    name: name.trim(),
    aliases: aliases ?? [],
    createdAt: now(),
  });
  return ref.id;
}

/**
 * Remove a tool from the catalog.
 */
export async function deleteTool(id: string): Promise<void> {
  await toolsCol().doc(id).delete();
}

// ── Admin: force check-in by doc ID ─────────────────────────────────

/**
 * Admin force-return: check in a tool by its activeCheckouts doc ID.
 * Moves the record to history and deletes from activeCheckouts.
 */
export async function checkinToolById(
  docId: string
): Promise<{ found: boolean; tool?: string; person?: string }> {
  const ref = activeCol().doc(docId);
  const doc = await ref.get();

  if (!doc.exists) {
    return { found: false };
  }

  const data = doc.data()!;

  await historyCol().add({
    tool: data.tool,
    person: data.person,
    phone: data.phone,
    checkedOutAt: data.checkedOutAt,
    returnedAt: now(),
  });

  await ref.delete();

  return { found: true, tool: data.tool, person: data.person };
}

// ── Admin: delete user ──────────────────────────────────────────────

export async function deleteUser(phone: string): Promise<void> {
  await usersCol().doc(phone).delete();
}

// ── Queries ─────────────────────────────────────────────────────────

/**
 * Get all currently checked-out tools.
 */
export async function getActiveCheckouts(): Promise<ActiveCheckout[]> {
  const snapshot = await activeCol().orderBy("checkedOutAt", "desc").get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      tool: d.tool,
      person: d.person,
      phone: d.phone,
      checkedOutAt: d.checkedOutAt,
    };
  });
}

/**
 * Look up who currently has a specific tool checked out.
 * Case-insensitive partial match on tool name.
 */
export async function getToolStatus(
  toolName: string
): Promise<ActiveCheckout[]> {
  const all = await getActiveCheckouts();
  const query = toolName.toLowerCase();
  return all.filter((c) => c.tool.toLowerCase().includes(query));
}

/**
 * Get all tools currently checked out by a specific person (by phone).
 */
export async function getToolsByPhone(
  phone: string
): Promise<ActiveCheckout[]> {
  const snapshot = await activeCol().where("phone", "==", phone).get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      tool: d.tool,
      person: d.person,
      phone: d.phone,
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

/**
 * Save a message (user or assistant) to conversation history.
 */
export async function saveMessage(
  phone: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await conversationsCol()
    .doc(phone)
    .collection("messages")
    .add({
      role,
      content,
      timestamp: now(),
    });
}

/**
 * Get the most recent messages for a phone number.
 * Returns them in chronological order (oldest first).
 */
export async function getRecentMessages(
  phone: string,
  limit = 6
): Promise<ChatMessage[]> {
  const snapshot = await conversationsCol()
    .doc(phone)
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

  // Reverse so they're chronological (oldest first).
  return messages.reverse();
}
