import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "@/config/prompts";
import type { ChatMessage } from "./sheets";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-2.5-flash";

// ── Response types ──────────────────────────────────────────────────

export type Intent =
  | "checkout"
  | "checkin"
  | "status"
  | "register"
  | "select_group"
  | "confirm"
  | "deny"
  | "greeting"
  | "thanks"
  | "unknown";

export interface ParsedIntent {
  intent: Intent;
  tool: string | null;
  name: string | null;
  group: string | null;
}

// ── Main parse function ─────────────────────────────────────────────

export async function parseIntent(
  message: string,
  isRegistered: boolean,
  history: ChatMessage[],
  needsGroup?: boolean
): Promise<ParsedIntent> {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  let context = isRegistered
    ? "User is registered."
    : "User is NOT registered (no name on file).";

  if (needsGroup) {
    context += " The bot just asked the user to pick a group.";
  }

  contents.push({
    role: "user",
    parts: [{ text: `[CONTEXT] ${context}` }],
  });
  contents.push({
    role: "model",
    parts: [{ text: '{"intent":"unknown","tool":null,"name":null,"group":null}' }],
  });

  for (const msg of history) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              enum: [
                "checkout",
                "checkin",
                "status",
                "register",
                "select_group",
                "confirm",
                "deny",
                "greeting",
                "thanks",
                "unknown",
              ],
            },
            tool: {
              type: Type.STRING,
              nullable: true,
              description: "Tool name as the user wrote it, or null",
            },
            name: {
              type: Type.STRING,
              nullable: true,
              description: "Person name for registration, or null",
            },
            group: {
              type: Type.STRING,
              nullable: true,
              description: "Group name selected during registration, or null",
            },
          },
          required: ["intent", "tool", "name", "group"],
        },
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text);

    return {
      intent: parsed.intent ?? "unknown",
      tool: parsed.tool ?? null,
      name: parsed.name ?? null,
      group: parsed.group ?? null,
    };
  } catch (error) {
    console.error("Gemini parse error:", error);
    return { intent: "unknown", tool: null, name: null, group: null };
  }
}
