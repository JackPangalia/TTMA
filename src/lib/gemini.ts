import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "@/config/prompts";
import type { User, ActiveCheckout, Tool } from "./types";
import type { ChatMessage } from "./sheets";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-2.5-flash";

// ── Response types ──────────────────────────────────────────────────

export interface BotAction {
  type: "register" | "checkout" | "checkin";
  tool?: string;
  name?: string;
}

export interface BotResponse {
  reply: string;
  action: BotAction | null;
}

// ── Context builder ─────────────────────────────────────────────────

/**
 * Build a minimal context block.
 *
 * - Known tools: cataloged tools for AI to prefer and normalize names.
 * - Registration state: so the AI knows whether to ask for a name.
 * - User's own tools: so the AI can resolve "the drill" and validate returns.
 * - All checkouts: needed for status queries and conflict detection.
 */
function buildContext(
  user: User | null,
  myTools: ActiveCheckout[],
  allCheckouts: ActiveCheckout[],
  knownTools: Tool[]
): string {
  const lines: string[] = ["[CONTEXT]"];

  // Known tools — include aliases so AI can match "dewalt drill" to "Dewalt 1223 Cordless Drill"
  if (knownTools.length > 0) {
    const toolsWithAliases = knownTools.map((t) => {
      if (t.aliases && t.aliases.length > 0) {
        return `${t.name} (aliases: ${t.aliases.join(", ")})`;
      }
      return t.name;
    });
    lines.push("Known tools: " + toolsWithAliases.join(", "));
  }

  // User state — this drives registration flow.
  if (!user || !user.name) {
    lines.push("User: NOT REGISTERED (no name on file)");
  } else {
    lines.push(`User: ${user.name}`);
  }

  // User's own tools — needed for checkin resolution and avoiding double-checkout.
  if (user?.name) {
    if (myTools.length > 0) {
      lines.push("Your tools:");
      for (const t of myTools) {
        lines.push(`  - ${t.tool} (since ${t.checkedOutAt})`);
      }
    } else {
      lines.push("You have no tools checked out.");
    }
  }

  // All active checkouts — needed for status queries and conflict detection.
  if (allCheckouts.length > 0) {
    lines.push("All active checkouts:");
    for (const c of allCheckouts) {
      lines.push(`  - ${c.tool} — ${c.person} (since ${c.checkedOutAt})`);
    }
  } else {
    lines.push("No tools are checked out by anyone.");
  }

  return lines.join("\n");
}

// ── Main chat function ──────────────────────────────────────────────

/**
 * Send a message to the AI with minimal context.
 * Returns the bot's reply text and an optional action to execute.
 *
 * History is kept short (last few messages) — just enough for the AI
 * to resolve "yes" / "that one" type follow-ups.
 */
export async function chat(
  message: string,
  user: User | null,
  myTools: ActiveCheckout[],
  allCheckouts: ActiveCheckout[],
  knownTools: Tool[],
  history: ChatMessage[]
): Promise<BotResponse> {
  const context = buildContext(user, myTools, allCheckouts, knownTools);

  const contents: { role: string; parts: { text: string }[] }[] = [];

  // Inject context as a synthetic first exchange.
  contents.push({
    role: "user",
    parts: [{ text: context }],
  });
  contents.push({
    role: "model",
    parts: [{ text: '{"reply":"Ready.","action":null}' }],
  });

  // Add recent conversation history (kept short — last 3 messages max).
  for (const msg of history) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Add the current message.
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
            reply: {
              type: Type.STRING,
              description: "Short reply to send back via WhatsApp",
            },
            action: {
              type: Type.OBJECT,
              nullable: true,
              description: "Action to execute, or null if none",
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ["register", "checkout", "checkin"],
                  description: "Action type",
                },
                tool: {
                  type: Type.STRING,
                  nullable: true,
                  description: "Tool name (for checkout/checkin)",
                },
                name: {
                  type: Type.STRING,
                  nullable: true,
                  description: "User's name (for register)",
                },
              },
              required: ["type"],
            },
          },
          required: ["reply"],
        },
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text);

    return {
      reply: parsed.reply ?? "Something went wrong. Try again?",
      action: parsed.action ?? null,
    };
  } catch (error) {
    console.error("Gemini error:", error);
    return {
      reply: "Something went wrong. Try again in a sec.",
      action: null,
    };
  }
}
