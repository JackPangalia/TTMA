// ── Tenant ──────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  joinCode: string;
  adminPassword: string;
  dashboardPassword: string;
  groupsEnabled: boolean;
  groupNames: string[];
  createdAt: string;
  status: "active" | "disabled";
}

// ── User (stored in the "users" collection) ─────────────────────────

export interface User {
  phone: string;
  name: string;
  group: string | null;
  tenantId: string;
  registeredAt: string; // ISO-8601 datetime
}

/**
 * A doc that has a phone number but no name yet.
 * Indicates the user is mid-registration (bot asked for their name).
 */
export interface PendingUser {
  phone: string;
  name: null;
  tenantId: string;
  registeredAt: string;
}

// ── Tools catalog ───────────────────────────────────────────────────

export interface Tool {
  id: string;
  name: string;
  aliases?: string[];
  group: string | null;
  tenantId: string;
  createdAt: string;
}

// ── Tool tracking ───────────────────────────────────────────────────

export interface ActiveCheckout {
  tool: string;
  person: string;
  phone: string;
  group: string | null;
  tenantId: string;
  checkedOutAt: string; // ISO-8601 datetime
}

export interface HistoryEntry {
  tool: string;
  person: string;
  phone: string;
  group: string | null;
  tenantId: string;
  checkedOutAt: string; // ISO-8601 datetime
  returnedAt: string; // ISO-8601 datetime
}

// ── Gemini AI intent parsing ────────────────────────────────────────

export type Intent =
  | "checkout"
  | "checkin"
  | "status"
  | "availability"
  | "help"
  | "register_name"
  | "select_group"
  | "unknown";

export interface ParsedIntent {
  intent: Intent;
  tool: string | null;
  name: string | null;
  group: string | null;
}

// ── Twilio webhook payload (incoming WhatsApp message) ──────────────

export interface TwilioWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string; // e.g. "whatsapp:+15551234567"
  To: string;
  Body: string;
  NumMedia: string;
  [key: string]: string; // additional Twilio fields
}
