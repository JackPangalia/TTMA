import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, twimlResponse } from "@/lib/twilio";
import { parseIntent } from "@/lib/gemini";
import { getTenantByTwilioNumber } from "@/lib/tenants";
import type { Tool, ActiveCheckout } from "@/lib/types";
import {
  getUser,
  createPendingUser,
  registerUser,
  setUserGroup,
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

function findMatchingTools(query: string, catalog: Tool[]): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const exact = catalog.filter(
    (t) =>
      t.name.toLowerCase() === q ||
      (t.aliases ?? []).some((a) => a.toLowerCase() === q)
  );
  if (exact.length > 0) return exact;

  const substring = catalog.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      q.includes(t.name.toLowerCase()) ||
      (t.aliases ?? []).some(
        (a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())
      )
  );
  if (substring.length > 0) return substring;

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

function findMatchingCheckout(
  query: string,
  userTools: ActiveCheckout[]
): ActiveCheckout | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const exact = userTools.find((t) => t.tool.toLowerCase() === q);
  if (exact) return exact;

  const partial = userTools.find(
    (t) => t.tool.toLowerCase().includes(q) || q.includes(t.tool.toLowerCase())
  );
  if (partial) return partial;

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
    const to = params.To ?? "";
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

    // ── 1b. Resolve tenant from the To number ───────────────────────
    const tenant = await getTenantByTwilioNumber(to);
    if (!tenant) {
      return twiml("This number is not configured. Contact your admin.");
    }
    const tenantId = tenant.id;

    // ── 2. Load user & context ──────────────────────────────────────
    let user = await getUser(tenantId, phone);
    if (!user) {
      await createPendingUser(tenantId, phone);
      user = await getUser(tenantId, phone);
    }

    const hasName = !!user?.name;
    const needsGroup =
      tenant.groupsEnabled && hasName && !user?.group;
    const isRegistered = hasName && !needsGroup;

    const [myTools, allCheckouts, knownTools, history] = await Promise.all([
      isRegistered ? getToolsByPhone(tenantId, phone) : Promise.resolve([]),
      getActiveCheckouts(tenantId),
      getTools(tenantId),
      getRecentMessages(tenantId, phone),
    ]);

    // ── 3. Save user message ────────────────────────────────────────
    await saveMessage(tenantId, phone, "user", body);

    // ── 4. Parse intent with AI ─────────────────────────────────────
    const parsed = await parseIntent(body, isRegistered, history, needsGroup);

    // ── 5. Handle intent (all logic is here) ────────────────────────
    let reply: string;

    switch (parsed.intent) {
      // ── Registration ──────────────────────────────────────────────
      case "register": {
        if (isRegistered) {
          reply = `You're already registered as ${user!.name}. Need a tool?`;
        } else if (needsGroup) {
          const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
          reply = `Got your name. Which group are you with?\n${list}`;
        } else if (parsed.name) {
          await registerUser(tenantId, phone, parsed.name);
          if (tenant.groupsEnabled) {
            const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
            reply = `Got it, ${parsed.name}. Which group are you with?\n${list}`;
          } else {
            reply = `Got it, ${parsed.name}. You're all set. Just text me when you grab or return a tool.`;
          }
        } else {
          reply = "What's your name?";
        }
        break;
      }

      // ── Group selection ───────────────────────────────────────────
      case "select_group": {
        if (!hasName) {
          reply = "Hey — looks like you're new. What's your name?";
          break;
        }
        if (!needsGroup) {
          reply = isRegistered
            ? `You're already set up${user!.group ? ` in ${user!.group}` : ""}. Need a tool?`
            : "Need a tool?";
          break;
        }

        const selectedGroup = parsed.group?.trim();
        const matchedGroup = selectedGroup
          ? tenant.groupNames.find(
              (g) => g.toLowerCase() === selectedGroup.toLowerCase()
            )
          : null;

        if (matchedGroup) {
          await setUserGroup(tenantId, phone, matchedGroup);
          reply = `${matchedGroup} — got it. You're all set. Just text me when you grab or return a tool.`;
        } else {
          const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
          reply = `Didn't catch that. Which group?\n${list}`;
        }
        break;
      }

      // ── Checkout ──────────────────────────────────────────────────
      case "checkout": {
        if (!isRegistered) {
          if (needsGroup) {
            const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
            reply = `Before you grab a tool, which group are you with?\n${list}`;
          } else {
            reply = "Hey — looks like you're new. What's your name?";
          }
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
          await saveMessage(tenantId, phone, "assistant", reply);
          return twiml(reply);
        }

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
          await checkoutTool(tenantId, tool.name, user!.name, phone, user!.group);
          reply = `${tool.name} — checked out to you. ✓`;
        }
        break;
      }

      // ── Checkin ───────────────────────────────────────────────────
      case "checkin": {
        if (!isRegistered) {
          if (needsGroup) {
            const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
            reply = `Before we continue, which group are you with?\n${list}`;
          } else {
            reply = "Hey — looks like you're new. What's your name?";
          }
          break;
        }

        if (myTools.length === 0) {
          reply = "You don't have any tools checked out.";
          break;
        }

        if (parsed.tool === "all") {
          for (const t of myTools) {
            await checkinTool(tenantId, t.tool, phone);
          }
          const names = myTools.map((t) => t.tool).join(", ");
          reply = `All returned: ${names}. ✓`;
          break;
        }

        if (!parsed.tool) {
          if (myTools.length === 1) {
            await checkinTool(tenantId, myTools[0].tool, phone);
            reply = `${myTools[0].tool} — returned. ✓`;
          } else {
            const list = myTools.map((t) => `- ${t.tool}`).join("\n");
            reply = `Which tool are you returning?\n${list}`;
          }
          break;
        }

        const checkinMatch = findMatchingCheckout(parsed.tool, myTools);

        if (checkinMatch) {
          await checkinTool(tenantId, checkinMatch.tool, phone);
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
        if (needsGroup) {
          const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
          reply = `Which group are you with?\n${list}`;
          break;
        }

        const lastBotMsg = [...history]
          .reverse()
          .find((m) => m.role === "assistant");

        if (!lastBotMsg) {
          reply = "Not sure what you're confirming. Need a tool?";
          break;
        }

        const numberedPattern = /^\d+\)\s+(.+)$/gm;
        const choices: string[] = [];
        let match;
        while ((match = numberedPattern.exec(lastBotMsg.content)) !== null) {
          choices.push(match[1]);
        }

        if (choices.length === 1 || (choices.length === 0 && lastBotMsg.content.includes("Do you mean"))) {
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
                await checkoutTool(tenantId, catalogTool[0].name, user!.name, phone, user!.group);
                reply = `${catalogTool[0].name} — checked out to you. ✓`;
              }
            } else {
              reply = "Not sure what you're confirming. Try again?";
            }
          } else {
            reply = "Not sure what you're confirming. Try again?";
          }
        } else if (choices.length > 1) {
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
          if (needsGroup) {
            const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
            reply = `Hey ${user!.name}. Which group are you with?\n${list}`;
          } else {
            reply = "Hey — looks like you're new. What's your name?";
          }
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
        // If the user needs to pick a group and typed a number, match it.
        if (needsGroup) {
          const num = parseInt(body.trim(), 10);
          if (!isNaN(num) && num > 0 && num <= tenant.groupNames.length) {
            const picked = tenant.groupNames[num - 1];
            await setUserGroup(tenantId, phone, picked);
            reply = `${picked} — got it. You're all set. Just text me when you grab or return a tool.`;
            await saveMessage(tenantId, phone, "assistant", reply);
            return twiml(reply);
          }

          // Try a text match
          const textMatch = tenant.groupNames.find(
            (g) => g.toLowerCase() === body.toLowerCase().trim()
          );
          if (textMatch) {
            await setUserGroup(tenantId, phone, textMatch);
            reply = `${textMatch} — got it. You're all set. Just text me when you grab or return a tool.`;
            await saveMessage(tenantId, phone, "assistant", reply);
            return twiml(reply);
          }

          const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
          reply = `Didn't catch that. Which group?\n${list}`;
          await saveMessage(tenantId, phone, "assistant", reply);
          return twiml(reply);
        }

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
                    tenantId,
                    catalogMatch[0].name,
                    user!.name,
                    phone,
                    user!.group
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
          if (needsGroup) {
            const list = tenant.groupNames.map((g, i) => `${i + 1}) ${g}`).join("\n");
            reply = `Which group are you with?\n${list}`;
          } else {
            reply = "Hey — looks like you're new. What's your name?";
          }
        } else {
          reply =
            "Didn't catch that. You can check out a tool, return one, or ask who has something.";
        }
        break;
      }
    }

    // ── 6. Save bot reply & respond ─────────────────────────────────
    await saveMessage(tenantId, phone, "assistant", reply);
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
