import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, twimlResponse } from "@/lib/twilio";
import { parseIntent } from "@/lib/gemini";
import type { Tool, ActiveCheckout } from "@/lib/types";
import {
  getUser,
  createPendingUser,
  registerUser,
  checkoutTool,
  checkinTool,
  getActiveCheckouts,
  getToolsByPhone,
  getTools,
  saveMessage,
  getRecentMessages,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

// ── Tool matching ────────────────────────────────────────────────────

/**
 * Find catalog tools that match what the user said.
 * Checks exact name match, alias match, and substring/partial matches.
 * Returns all matches so the backend can disambiguate.
 */
function findMatchingTools(query: string, catalog: Tool[]): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // 1. Exact match on name or alias — best case.
  const exact = catalog.filter(
    (t) =>
      t.name.toLowerCase() === q ||
      (t.aliases ?? []).some((a) => a.toLowerCase() === q)
  );
  if (exact.length > 0) return exact;

  // 2. Substring match — user said "drill" and catalog has "Dewalt Drill 3432".
  const substring = catalog.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      q.includes(t.name.toLowerCase()) ||
      (t.aliases ?? []).some(
        (a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())
      )
  );
  if (substring.length > 0) return substring;

  // 3. Word overlap — user said "dewalt drill" and catalog has "Dewalt 1223 Cordless Drill".
  const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
  if (queryWords.length === 0) return [];

  const scored = catalog
    .map((t) => {
      const nameWords = t.name.toLowerCase().split(/\s+/);
      const aliasWords = (t.aliases ?? []).flatMap((a) =>
        a.toLowerCase().split(/\s+/)
      );
      const allWords = [...nameWords, ...aliasWords];
      const hits = queryWords.filter((w) =>
        allWords.some((aw) => aw.includes(w) || w.includes(aw))
      );
      return { tool: t, score: hits.length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  return scored.filter((s) => s.score === topScore).map((s) => s.tool);
}

/**
 * Find which of the user's checked-out tools matches what they said.
 */
function findMatchingCheckout(
  query: string,
  userTools: ActiveCheckout[]
): ActiveCheckout | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact match first.
  const exact = userTools.find((t) => t.tool.toLowerCase() === q);
  if (exact) return exact;

  // Substring / partial match.
  const partial = userTools.find(
    (t) => t.tool.toLowerCase().includes(q) || q.includes(t.tool.toLowerCase())
  );
  if (partial) return partial;

  // Word overlap.
  const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
  if (queryWords.length === 0) return null;

  const scored = userTools
    .map((t) => {
      const toolWords = t.tool.toLowerCase().split(/\s+/);
      const hits = queryWords.filter((w) =>
        toolWords.some((tw) => tw.includes(w) || w.includes(tw))
      );
      return { checkout: t, score: hits.length };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].checkout : null;
}

// ── Form body parser ────────────────────────────────────────────────

async function parseFormBody(
  req: NextRequest
): Promise<Record<string, string>> {
  const text = await req.text();
  const params: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [key, value] = pair.split("=").map(decodeURIComponent);
    if (key) params[key] = value ?? "";
  }
  return params;
}

// ── Webhook handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse & validate Twilio request ──────────────────────────
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

    // ── 2. Load user & context ──────────────────────────────────────
    let user = await getUser(phone);
    if (!user) {
      await createPendingUser(phone);
      user = await getUser(phone);
    }

    const isRegistered = !!user?.name;
    const [myTools, allCheckouts, knownTools, history] = await Promise.all([
      isRegistered ? getToolsByPhone(phone) : Promise.resolve([]),
      getActiveCheckouts(),
      getTools(),
      getRecentMessages(phone),
    ]);

    // ── 3. Save user message ────────────────────────────────────────
    await saveMessage(phone, "user", body);

    // ── 4. Parse intent with AI ─────────────────────────────────────
    const parsed = await parseIntent(body, isRegistered, history);

    // ── 5. Handle intent (all logic is here) ────────────────────────
    let reply: string;

    switch (parsed.intent) {
      // ── Registration ──────────────────────────────────────────────
      case "register": {
        if (isRegistered) {
          reply = `You're already registered as ${user!.name}. Need a tool?`;
        } else if (parsed.name) {
          await registerUser(phone, parsed.name);
          reply = `Got it, ${parsed.name}. You're all set. Just text me when you grab or return a tool.`;
        } else {
          reply = "What's your name?";
        }
        break;
      }

      // ── Checkout ──────────────────────────────────────────────────
      case "checkout": {
        if (!isRegistered) {
          reply = "Hey — looks like you're new. What's your name?";
          break;
        }

        if (!parsed.tool) {
          reply = "Which tool are you grabbing?";
          break;
        }

        const checkoutMatches = findMatchingTools(parsed.tool, knownTools);

        if (checkoutMatches.length === 0) {
          reply = `No tool matching "${parsed.tool}" in the catalog. Managers add tools via the dashboard.`;
          break;
        }

        if (checkoutMatches.length > 1) {
          const list = checkoutMatches
            .map((t, i) => `${i + 1}) ${t.name}`)
            .join("\n");
          reply = `Multiple tools match. Which one?\n${list}`;
          // Save the pending choices so "confirm" can resolve them.
          await saveMessage(phone, "assistant", reply);
          return twiml(reply);
        }

        // Single match — check for conflicts.
        const tool = checkoutMatches[0];
        const conflict = allCheckouts.find(
          (c) => c.tool.toLowerCase() === tool.name.toLowerCase()
        );

        if (conflict) {
          if (conflict.phone === phone) {
            reply = `You already have ${tool.name} checked out.`;
          } else {
            reply = `${tool.name} is checked out to ${conflict.person}. Not available right now.`;
          }
        } else {
          await checkoutTool(tool.name, user!.name, phone);
          reply = `${tool.name} — checked out to you. ✓`;
        }
        break;
      }

      // ── Checkin ───────────────────────────────────────────────────
      case "checkin": {
        if (!isRegistered) {
          reply = "Hey — looks like you're new. What's your name?";
          break;
        }

        if (myTools.length === 0) {
          reply = "You don't have any tools checked out.";
          break;
        }

        // "returning everything"
        if (parsed.tool === "all") {
          for (const t of myTools) {
            await checkinTool(t.tool, phone);
          }
          const names = myTools.map((t) => t.tool).join(", ");
          reply = `All returned: ${names}. ✓`;
          break;
        }

        if (!parsed.tool) {
          if (myTools.length === 1) {
            // Only one tool — just return it.
            await checkinTool(myTools[0].tool, phone);
            reply = `${myTools[0].tool} — returned. ✓`;
          } else {
            const list = myTools.map((t) => `- ${t.tool}`).join("\n");
            reply = `Which tool are you returning?\n${list}`;
          }
          break;
        }

        // Match against user's checked-out tools.
        const checkinMatch = findMatchingCheckout(parsed.tool, myTools);

        if (checkinMatch) {
          await checkinTool(checkinMatch.tool, phone);
          reply = `${checkinMatch.tool} — returned. ✓`;
        } else {
          const list = myTools.map((t) => `- ${t.tool}`).join("\n");
          reply = `You don't have a tool matching "${parsed.tool}" checked out. Your tools:\n${list}`;
        }
        break;
      }

      // ── Status queries ────────────────────────────────────────────
      case "status": {
        if (parsed.tool) {
          // "Who has the drill?"
          const q = parsed.tool.toLowerCase();
          const matches = allCheckouts.filter(
            (c) =>
              c.tool.toLowerCase().includes(q) ||
              q.includes(c.tool.toLowerCase())
          );

          if (matches.length === 0) {
            reply = `No one has anything matching "${parsed.tool}" checked out.`;
          } else {
            reply = matches
              .map((c) => {
                const since = formatTime(c.checkedOutAt);
                return `${c.person} has ${c.tool} (since ${since})`;
              })
              .join("\n");
          }
        } else {
          // "What's checked out?" or "What do I have?"
          const isAskingAboutSelf =
            body.toLowerCase().includes("my") ||
            body.toLowerCase().includes("i have") ||
            body.toLowerCase().includes("do i");

          if (isAskingAboutSelf) {
            if (myTools.length === 0) {
              reply = "You don't have any tools checked out.";
            } else {
              reply = myTools.map((t) => `- ${t.tool}`).join("\n");
            }
          } else {
            if (allCheckouts.length === 0) {
              reply = "Nothing is checked out right now.";
            } else {
              reply = allCheckouts
                .map((c) => `${c.tool} — ${c.person}`)
                .join("\n");
            }
          }
        }
        break;
      }

      // ── Confirm (yes/yeah in response to disambiguation) ──────────
      case "confirm": {
        // Look at the last bot message to see what we asked.
        const lastBotMsg = [...history]
          .reverse()
          .find((m) => m.role === "assistant");

        if (!lastBotMsg) {
          reply = "Not sure what you're confirming. Need a tool?";
          break;
        }

        // Check if the last message was a disambiguation list ("1) Tool A\n2) Tool B").
        const numberedPattern = /^\d+\)\s+(.+)$/gm;
        const choices: string[] = [];
        let match;
        while ((match = numberedPattern.exec(lastBotMsg.content)) !== null) {
          choices.push(match[1]);
        }

        if (choices.length === 1 || (choices.length === 0 && lastBotMsg.content.includes("Do you mean"))) {
          // Single suggestion — "Do you mean X?" — user said yes.
          const doYouMeanMatch = lastBotMsg.content.match(
            /Do you mean (?:the )?(.+)\?/i
          );
          const toolName = doYouMeanMatch
            ? doYouMeanMatch[1]
            : choices[0] ?? null;

          if (toolName && isRegistered) {
            const catalogTool = findMatchingTools(toolName, knownTools);
            if (catalogTool.length === 1) {
              const conflict = allCheckouts.find(
                (c) =>
                  c.tool.toLowerCase() === catalogTool[0].name.toLowerCase()
              );
              if (conflict) {
                reply =
                  conflict.phone === phone
                    ? `You already have ${catalogTool[0].name} checked out.`
                    : `${catalogTool[0].name} is checked out to ${conflict.person}. Not available.`;
              } else {
                await checkoutTool(catalogTool[0].name, user!.name, phone);
                reply = `${catalogTool[0].name} — checked out to you. ✓`;
              }
            } else {
              reply = "Not sure what you're confirming. Try again?";
            }
          } else {
            reply = "Not sure what you're confirming. Try again?";
          }
        } else if (choices.length > 1) {
          // They said "yes" to a list — need a number.
          reply = "Which number? Reply with the number (e.g. 1, 2, etc.)";
        } else {
          reply = "👍";
        }
        break;
      }

      // ── Deny ──────────────────────────────────────────────────────
      case "deny": {
        reply = "Ok, no worries. Need something else?";
        break;
      }

      // ── Greeting ──────────────────────────────────────────────────
      case "greeting": {
        if (!isRegistered) {
          reply = "Hey — looks like you're new. What's your name?";
        } else {
          reply = "Hey. What tool do you need?";
        }
        break;
      }

      // ── Thanks ────────────────────────────────────────────────────
      case "thanks": {
        reply = "👍";
        break;
      }

      // ── Unknown / fallback ────────────────────────────────────────
      case "unknown":
      default: {
        // Check if the message is a number — could be selecting from a list.
        const num = parseInt(body.trim(), 10);
        if (!isNaN(num) && num > 0) {
          const lastBotMsg = [...history]
            .reverse()
            .find((m) => m.role === "assistant");

          if (lastBotMsg) {
            const numberedPattern = /^\d+\)\s+(.+)$/gm;
            const choices: string[] = [];
            let listMatch;
            while (
              (listMatch = numberedPattern.exec(lastBotMsg.content)) !== null
            ) {
              choices.push(listMatch[1]);
            }

            if (num <= choices.length) {
              const selectedName = choices[num - 1];
              const catalogMatch = findMatchingTools(selectedName, knownTools);
              if (catalogMatch.length === 1 && isRegistered) {
                const conflict = allCheckouts.find(
                  (c) =>
                    c.tool.toLowerCase() ===
                    catalogMatch[0].name.toLowerCase()
                );
                if (conflict) {
                  reply =
                    conflict.phone === phone
                      ? `You already have ${catalogMatch[0].name} checked out.`
                      : `${catalogMatch[0].name} is checked out to ${conflict.person}. Not available.`;
                } else {
                  await checkoutTool(
                    catalogMatch[0].name,
                    user!.name,
                    phone
                  );
                  reply = `${catalogMatch[0].name} — checked out to you. ✓`;
                }
              } else {
                reply = "Something went wrong. Try again?";
              }
              break;
            }
          }
        }

        if (!isRegistered) {
          reply = "Hey — looks like you're new. What's your name?";
        } else {
          reply =
            "Didn't catch that. You can check out a tool, return one, or ask who has something.";
        }
        break;
      }
    }

    // ── 6. Save bot reply & respond ─────────────────────────────────
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

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}
