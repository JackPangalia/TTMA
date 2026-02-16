import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, twimlResponse } from "@/lib/twilio";
import { chat } from "@/lib/gemini";
import {
  getUser,
  createPendingUser,
  registerUser,
  checkoutTool,
  checkinTool,
  getActiveCheckouts,
  getToolsByPhone,
  saveMessage,
  getRecentMessages,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * Parse the URL-encoded form body that Twilio sends.
 */
async function parseFormBody(req: NextRequest): Promise<Record<string, string>> {
  const text = await req.text();
  const params: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [key, value] = pair.split("=").map(decodeURIComponent);
    if (key) params[key] = value ?? "";
  }
  return params;
}

/**
 * POST /api/webhook
 *
 * Flow:
 *   1. Parse & validate the Twilio request.
 *   2. Gather minimal context (user, their tools, all checkouts).
 *   3. Send to Gemini — it returns a reply + optional action.
 *   4. Backend validates and executes the action.
 *   5. If action fails validation, override the AI reply with a clear message.
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse & validate ───────────────────────────────────────
    const params = await parseFormBody(req);
    const phone = params.From ?? "";
    const body = (params.Body ?? "").trim();

    if (process.env.NODE_ENV === "production") {
      const signature = req.headers.get("x-twilio-signature") ?? "";
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`;
      if (!validateTwilioSignature(signature, url, params)) {
        return new NextResponse("Unauthorized", { status: 403 });
      }
    }

    if (!phone || !body) {
      return twiml("Couldn't read your message. Try again?");
    }

    // ── 2. Gather context ─────────────────────────────────────────
    let user = await getUser(phone);

    if (!user) {
      await createPendingUser(phone);
      user = await getUser(phone);
    }

    const myTools = user?.name ? await getToolsByPhone(phone) : [];
    const allCheckouts = await getActiveCheckouts();
    const history = await getRecentMessages(phone);

    // ── 3. Save user message ──────────────────────────────────────
    await saveMessage(phone, "user", body);

    // ── 4. Ask the AI ─────────────────────────────────────────────
    const response = await chat(body, user, myTools, allCheckouts, history);

    // ── 5. Validate & execute action ──────────────────────────────
    let reply = response.reply;

    if (response.action) {
      const action = response.action;

      switch (action.type) {
        case "register": {
          if (action.name) {
            await registerUser(phone, action.name);
          }
          break;
        }

        case "checkout": {
          if (!user?.name) {
            reply = "You need to register first. What's your name?";
            break;
          }

          if (!action.tool) {
            reply = "Which tool are you grabbing?";
            break;
          }

          // Backend validation: is this tool already checked out?
          const conflict = allCheckouts.find(
            (c) => c.tool.toLowerCase() === action.tool!.toLowerCase()
          );

          if (conflict) {
            if (conflict.phone === phone) {
              reply = `You already have the ${conflict.tool} checked out.`;
            } else {
              reply = `${conflict.tool} is checked out to ${conflict.person}. Not available right now.`;
            }
          } else {
            await checkoutTool(action.tool, user.name, phone);
          }
          break;
        }

        case "checkin": {
          if (!action.tool) {
            reply = "Which tool are you returning?";
            break;
          }

          // Backend validation: does this user actually have this tool?
          const result = await checkinTool(action.tool, phone);

          if (!result.found) {
            // Check if someone else has it.
            const otherHasIt = allCheckouts.find(
              (c) =>
                c.tool.toLowerCase() === action.tool!.toLowerCase() &&
                c.phone !== phone
            );

            if (otherHasIt) {
              reply = `${otherHasIt.tool} is checked out to ${otherHasIt.person}, not you.`;
            } else {
              reply = `${action.tool} isn't checked out to you.`;
            }
          }
          break;
        }
      }
    }

    // ── 6. Save bot reply & respond ───────────────────────────────
    await saveMessage(phone, "assistant", reply);

    return twiml(reply);
  } catch (error) {
    console.error("Webhook error:", error);
    return twiml("Something went wrong. Try again in a moment.");
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function twiml(message: string): NextResponse {
  return new NextResponse(twimlResponse(message), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
