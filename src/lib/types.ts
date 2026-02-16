// ── User (stored in the "Users" Excel sheet) ────────────────────────

export interface User {
  phone: string;
  name: string;
  registeredAt: string; // ISO-8601 datetime
}

/**
 * A row in the Users sheet that has a phone number but no name yet.
 * Indicates the user is mid-registration (bot asked for their name).
 */
export interface PendingUser {
  phone: string;
  name: null;
  registeredAt: string;
}

// ── Tool tracking (stored in Excel sheets) ──────────────────────────

export interface ActiveCheckout {
  tool: string;
  person: string;
  phone: string;
  checkedOutAt: string; // ISO-8601 datetime
}

export interface HistoryEntry {
  tool: string;
  person: string;
  phone: string;
  checkedOutAt: string; // ISO-8601 datetime
  returnedAt: string; // ISO-8601 datetime
}

// ── Gemini AI intent parsing ────────────────────────────────────────

export type Intent =
  | "checkout"
  | "checkin"
  | "status"
  | "help"
  | "register_name"
  | "unknown";

export interface ParsedIntent {
  intent: Intent;
  tool: string | null;
  name: string | null;
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
