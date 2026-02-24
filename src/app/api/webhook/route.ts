import { NextRequest, NextResponse } from "next/server";
import { validateTwilioSignature, twimlResponse } from "@/lib/twilio";
import { parseIntent } from "@/lib/gemini";
import { getTenantByJoinCode, getTenantById } from "@/lib/tenants";
import type { Tool, ActiveCheckout, Tenant } from "@/lib/types";
import {
  getUser,
  getUserByPhone,
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
export const maxDuration = 60;

// ── Catalog lookup (exact match only) ────────────────────────────────

function findToolByName(name: string, catalog: Tool[]): Tool | null {
  return (
    catalog.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null
  );
}

function findCheckoutByToolName(
  toolName: string,
  userTools: ActiveCheckout[]
): ActiveCheckout | null {
  return (
    userTools.find(
      (t) => t.tool.toLowerCase() === toolName.toLowerCase()
    ) ?? null
  );
}

// ── Form body parser ────────────────────────────────────────────────

async function parseFormBody(
  req: NextRequest
): Promise<Record<string, string>> {
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
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

    // ── 1b. Resolve tenant from phone number or onboarding flow ─────
    let tenant: Tenant | null = null;
    const existingUser = await getUserByPhone(phone);

    if (existingUser?.tenantId) {
      tenant = await getTenantById(existingUser.tenantId);
    }

    if (!tenant) {
      return handleOnboarding(phone, body);
    }

    const tenantId = tenant.id;

    // ── 2. Load user & context ──────────────────────────────────────
    let user = await getUser(tenantId, phone);
    if (!user) {
      await createPendingUser(tenantId, phone);
      user = await getUser(tenantId, phone);
    }

    const hasName = !!user?.name;
    const needsGroup = tenant.groupsEnabled && hasName && !user?.group;
    const isRegistered = hasName && !needsGroup;

    const [myTools, allCheckouts, knownTools, history] = await Promise.all([
      isRegistered ? getToolsByPhone(tenantId, phone) : Promise.resolve([]),
      getActiveCheckouts(tenantId),
      getTools(tenantId),
      getRecentMessages(tenantId, phone),
    ]);

    // ── 3. Save user message ────────────────────────────────────────
    await saveMessage(tenantId, phone, "user", body);

    // ── 4. Parse intent with AI (catalog-aware) ─────────────────────
    const parsed = await parseIntent(
      body,
      isRegistered,
      history,
      needsGroup,
      knownTools,
      allCheckouts
    );

    // ── 5. Handle intent ────────────────────────────────────────────
    let reply: string;

    switch (parsed.intent) {
      // ── Registration ──────────────────────────────────────────────
      case "register": {
        if (isRegistered) {
          reply = `You're already registered as ${user!.name}. Need a tool?`;
        } else if (needsGroup) {
          const list = tenant.groupNames
            .map((g, i) => `${i + 1}) ${g}`)
            .join("\n");
          reply = `Got your name. Which group are you with?\n${list}`;
        } else if (parsed.name) {
          await registerUser(tenantId, phone, parsed.name);
          if (tenant.groupsEnabled) {
            const list = tenant.groupNames
              .map((g, i) => `${i + 1}) ${g}`)
              .join("\n");
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
          const list = tenant.groupNames
            .map((g, i) => `${i + 1}) ${g}`)
            .join("\n");
          reply = `Didn't catch that. Which group?\n${list}`;
        }
        break;
      }

      // ── Checkout ──────────────────────────────────────────────────
      case "checkout": {
        if (!isRegistered) {
          if (needsGroup) {
            const list = tenant.groupNames
              .map((g, i) => `${i + 1}) ${g}`)
              .join("\n");
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

        const tool = findToolByName(parsed.tool, knownTools);

        if (!tool) {
          reply = `No tool matching "${parsed.tool}" in the catalog. Check the dashboard for available tools.`;
          break;
        }

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
          await checkoutTool(
            tenantId,
            tool.name,
            user!.name,
            phone,
            user!.group
          );
          reply = `${tool.name} — checked out to you. ✓`;
        }
        break;
      }

      // ── Checkin ───────────────────────────────────────────────────
      case "checkin": {
        if (!isRegistered) {
          if (needsGroup) {
            const list = tenant.groupNames
              .map((g, i) => `${i + 1}) ${g}`)
              .join("\n");
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
            const list = myTools
              .map((t, i) => `${i + 1}) ${t.tool}`)
              .join("\n");
            reply = `Which tool are you returning?\n${list}`;
          }
          break;
        }

        const checkinMatch = findCheckoutByToolName(parsed.tool, myTools);

        if (checkinMatch) {
          await checkinTool(tenantId, checkinMatch.tool, phone);
          reply = `${checkinMatch.tool} — returned. ✓`;
        } else {
          const list = myTools.map((t) => `- ${t.tool}`).join("\n");
          reply = `You don't have "${parsed.tool}" checked out. Your tools:\n${list}`;
        }
        break;
      }

      // ── Status queries ────────────────────────────────────────────
      case "status": {
        if (parsed.tool) {
          const match = allCheckouts.find(
            (c) => c.tool.toLowerCase() === parsed.tool!.toLowerCase()
          );

          if (match) {
            const since = formatTime(match.checkedOutAt);
            reply = `${match.person} has ${match.tool} (since ${since})`;
          } else {
            reply = `${parsed.tool} is available — no one has it checked out.`;
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

      // ── Availability ──────────────────────────────────────────────
      case "availability": {
        const checkedOutNames = new Set(
          allCheckouts.map((c) => c.tool.toLowerCase())
        );
        const availableTools = knownTools.filter(
          (t) => !checkedOutNames.has(t.name.toLowerCase())
        );

        if (parsed.tool) {
          const isOut = checkedOutNames.has(parsed.tool.toLowerCase());
          if (isOut) {
            const who = allCheckouts.find(
              (c) => c.tool.toLowerCase() === parsed.tool!.toLowerCase()
            );
            reply = `${parsed.tool} is not available — ${who?.person} has it.`;
          } else {
            reply = `${parsed.tool} is available. Want to grab it?`;
          }
        } else {
          if (availableTools.length === 0) {
            reply = "Everything is checked out right now.";
          } else {
            const list = availableTools
              .map((t) => `- ${t.name}`)
              .join("\n");
            reply = `Available tools:\n${list}`;
          }
        }
        break;
      }

      // ── Confirm (yes/yeah in response to disambiguation) ──────────
      case "confirm": {
        if (needsGroup) {
          const list = tenant.groupNames
            .map((g, i) => `${i + 1}) ${g}`)
            .join("\n");
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

        if (
          choices.length === 1 ||
          (choices.length === 0 &&
            lastBotMsg.content.includes("Do you mean"))
        ) {
          const doYouMeanMatch = lastBotMsg.content.match(
            /Do you mean (?:the )?(.+)\?/i
          );
          const toolName = doYouMeanMatch
            ? doYouMeanMatch[1]
            : choices[0] ?? null;

          if (toolName && isRegistered) {
            const catalogTool = findToolByName(toolName, knownTools);
            if (catalogTool) {
              const conflict = allCheckouts.find(
                (c) =>
                  c.tool.toLowerCase() === catalogTool.name.toLowerCase()
              );
              if (conflict) {
                reply =
                  conflict.phone === phone
                    ? `You already have ${catalogTool.name} checked out.`
                    : `${catalogTool.name} is checked out to ${conflict.person}. Not available.`;
              } else {
                await checkoutTool(
                  tenantId,
                  catalogTool.name,
                  user!.name,
                  phone,
                  user!.group
                );
                reply = `${catalogTool.name} — checked out to you. ✓`;
              }
            } else {
              reply = "Not sure what you're confirming. Try again?";
            }
          } else {
            reply = "Not sure what you're confirming. Try again?";
          }
        } else if (choices.length > 1) {
          reply =
            "Which number? Reply with the number (e.g. 1, 2, etc.)";
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
            const list = tenant.groupNames
              .map((g, i) => `${i + 1}) ${g}`)
              .join("\n");
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
        if (needsGroup) {
          const num = parseInt(body.trim(), 10);
          if (
            !isNaN(num) &&
            num > 0 &&
            num <= tenant.groupNames.length
          ) {
            const picked = tenant.groupNames[num - 1];
            await setUserGroup(tenantId, phone, picked);
            reply = `${picked} — got it. You're all set. Just text me when you grab or return a tool.`;
            await saveMessage(tenantId, phone, "assistant", reply);
            return twiml(reply);
          }

          const textMatch = tenant.groupNames.find(
            (g) => g.toLowerCase() === body.toLowerCase().trim()
          );
          if (textMatch) {
            await setUserGroup(tenantId, phone, textMatch);
            reply = `${textMatch} — got it. You're all set. Just text me when you grab or return a tool.`;
            await saveMessage(tenantId, phone, "assistant", reply);
            return twiml(reply);
          }

          const list = tenant.groupNames
            .map((g, i) => `${i + 1}) ${g}`)
            .join("\n");
          reply = `Didn't catch that. Which group?\n${list}`;
          await saveMessage(tenantId, phone, "assistant", reply);
          return twiml(reply);
        }

        // Handle numbered replies to previous bot lists
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
              (listMatch = numberedPattern.exec(lastBotMsg.content)) !==
              null
            ) {
              choices.push(listMatch[1]);
            }

            if (num <= choices.length) {
              const selectedName = choices[num - 1];
              const catalogMatch = findToolByName(
                selectedName,
                knownTools
              );
              if (catalogMatch && isRegistered) {
                const conflict = allCheckouts.find(
                  (c) =>
                    c.tool.toLowerCase() ===
                    catalogMatch.name.toLowerCase()
                );
                if (conflict) {
                  reply =
                    conflict.phone === phone
                      ? `You already have ${catalogMatch.name} checked out.`
                      : `${catalogMatch.name} is checked out to ${conflict.person}. Not available.`;
                } else {
                  await checkoutTool(
                    tenantId,
                    catalogMatch.name,
                    user!.name,
                    phone,
                    user!.group
                  );
                  reply = `${catalogMatch.name} — checked out to you. ✓`;
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
            const list = tenant.groupNames
              .map((g, i) => `${i + 1}) ${g}`)
              .join("\n");
            reply = `Which group are you with?\n${list}`;
          } else {
            reply = "Hey — looks like you're new. What's your name?";
          }
        } else {
          reply =
            "Didn't catch that. Here's what I can do:\n1) Check out a tool\n2) Return a tool\n3) See what's available\n4) See who has what\n\nJust tell me what you need.";
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

// ── Onboarding flow for unknown phone numbers ───────────────────────

async function handleOnboarding(
  phone: string,
  body: string
): Promise<NextResponse> {
  const history = await getRecentMessages("", phone, 4);
  await saveMessage("", phone, "user", body);

  const lastBotMsg = [...history]
    .reverse()
    .find((m) => m.role === "assistant");
  const awaitingCode =
    !lastBotMsg || lastBotMsg.content.includes("join code");

  if (awaitingCode) {
    const code = body.trim();
    const tenant = await getTenantByJoinCode(code);

    if (tenant) {
      await createPendingUser(tenant.id, phone);
      const reply = `Got it — ${tenant.name}! What's your name?`;
      await saveMessage("", phone, "assistant", reply);
      return twiml(reply);
    }

    const reply =
      history.length > 0
        ? "Didn't recognize that code. Try again, or check with your manager."
        : "Welcome to TTMA! What's your company join code? Your manager will give you this.";
    await saveMessage("", phone, "assistant", reply);
    return twiml(reply);
  }

  const reply =
    "What's your company join code? Your manager will give you this.";
  await saveMessage("", phone, "assistant", reply);
  return twiml(reply);
}
