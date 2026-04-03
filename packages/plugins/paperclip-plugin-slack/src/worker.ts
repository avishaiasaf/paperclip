import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginContext, PluginWebhookInput, ToolResult } from "@paperclipai/plugin-sdk";

const SLACK_API = "https://slack.com/api";

let currentCtx: PluginContext | null = null;

const plugin = definePlugin({
  async setup(ctx) {
    currentCtx = ctx;
    ctx.logger.info("Slack plugin setup complete");

    ctx.events.on("issue.created", async (event) => {
      const config = await getConfig(ctx);
      if (!config.notifyOnIssueCreated || !config.defaultChannelId) return;
      const p = event.payload as Record<string, unknown> | undefined;
      await postSlackMessage(config.botToken, config.defaultChannelId, {
        text: `New issue: ${p?.displayId ?? ""} ${p?.title ?? "Untitled"}`,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `:clipboard: *New Issue Created*\n*${p?.displayId ?? ""}* ${p?.title ?? "Untitled"}` },
          },
        ],
      });
    });

    ctx.events.on("approval.created", async (event) => {
      const config = await getConfig(ctx);
      if (!config.notifyOnApprovalRequired) return;
      const channelId = config.approvalChannelId || config.defaultChannelId;
      if (!channelId) return;
      const p = event.payload as Record<string, unknown> | undefined;
      await postSlackMessage(config.botToken, channelId, {
        text: `Approval required`,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `:white_check_mark: *Approval Required*\n${p?.summary ?? ""}` },
          },
          {
            type: "actions",
            elements: [
              { type: "button", text: { type: "plain_text", text: "Approve" }, style: "primary", action_id: "approve", value: event.entityId ?? "" },
              { type: "button", text: { type: "plain_text", text: "Reject" }, style: "danger", action_id: "reject", value: event.entityId ?? "" },
            ],
          },
        ],
      });
    });

    ctx.events.on("cost_event.created", async (event) => {
      const config = await getConfig(ctx);
      if (!config.notifyOnBudgetAlert || !config.defaultChannelId) return;
      const p = event.payload as Record<string, unknown> | undefined;
      if (p?.budgetExceeded) {
        await postSlackMessage(config.botToken, config.defaultChannelId, {
          text: `Budget alert: ${p?.agentName ?? "Agent"} exceeded budget`,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: `:money_with_wings: *Budget Alert*\n*${p?.agentName ?? "Agent"}* exceeded budget` },
            },
          ],
        });
      }
    });

    ctx.tools.register(
      "send-slack-message",
      {
        displayName: "Send Slack Message",
        description: "Send a message to a Slack channel",
        parametersSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
            channelId: { type: "string" },
            threadTs: { type: "string" },
          },
          required: ["message"],
        },
      },
      async (params, runCtx): Promise<ToolResult> => {
        const config = await getConfig(ctx);
        const typed = params as { message: string; channelId?: string; threadTs?: string };
        const channelId = typed.channelId ?? config.defaultChannelId;
        if (!channelId) return { content: "Error: No channel ID configured" };
        await postSlackMessage(config.botToken, channelId, { text: typed.message, thread_ts: typed.threadTs });
        return { content: "Message sent to Slack" };
      },
    );

    ctx.tools.register(
      "add-slack-reaction",
      {
        displayName: "Add Slack Reaction",
        description: "Add an emoji reaction to a Slack message",
        parametersSchema: {
          type: "object",
          properties: {
            emoji: { type: "string" },
            channelId: { type: "string" },
            messageTs: { type: "string" },
          },
          required: ["emoji", "channelId", "messageTs"],
        },
      },
      async (params): Promise<ToolResult> => {
        const config = await getConfig(ctx);
        const typed = params as { emoji: string; channelId: string; messageTs: string };
        await slackApiCall(config.botToken, "reactions.add", { name: typed.emoji, channel: typed.channelId, timestamp: typed.messageTs });
        return { content: "Reaction added" };
      },
    );
  },

  async onHealth() {
    return { status: "ok", message: "Slack plugin ready" };
  },

  async onWebhook(input: PluginWebhookInput) {
    const ctx = currentCtx;
    if (!ctx) return;

    const body = input.parsedBody as Record<string, unknown> | undefined;
    if (!body) return;

    // Slack URL verification
    if (body.type === "url_verification") {
      ctx.logger.info("Slack URL verification received");
      return;
    }

    // Events API
    if (body.type === "event_callback" && input.endpointKey === "slack-events") {
      const event = body.event as Record<string, unknown>;
      const eventType = event.type as string;

      if (eventType === "app_mention" || eventType === "message") {
        const text = (event.text as string) ?? "";
        const channelId = (event.channel as string) ?? "";
        const commandMatch = text.match(/<@\w+>\s+(\/.+)/);
        if (commandMatch) {
          const config = await getConfig(ctx);
          const [command, ...args] = commandMatch[1].split(" ");
          const response = await handleCommand(ctx, command, args);
          if (response) {
            await postSlackMessage(config.botToken, channelId, { text: response, thread_ts: event.ts as string });
          }
        }
      }
      return;
    }

    // Interactive payloads (button clicks)
    if (input.endpointKey === "slack-interactions") {
      const payloadStr = typeof body.payload === "string" ? body.payload : "";
      if (!payloadStr) return;
      let payload: Record<string, unknown>;
      try { payload = JSON.parse(payloadStr); } catch { return; }

      const actions = (payload.actions as Array<Record<string, unknown>>) ?? [];
      for (const action of actions) {
        const actionId = action.action_id as string;
        const approvalId = action.value as string;
        if ((actionId === "approve" || actionId === "reject") && approvalId) {
          const icon = actionId === "approve" ? "✅" : "❌";
          const decision = actionId === "approve" ? "Approved" : "Rejected";
          const responseUrl = (payload.response_url as string) ?? "";
          if (responseUrl) {
            await fetch(responseUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ replace_original: true, text: `${icon} ${decision} via Slack` }),
            });
          }
          ctx.logger.info("Slack approval action processed", { approvalId, decision });
        }
      }
    }
  },
});

interface SlackConfig {
  botToken: string;
  defaultChannelId: string;
  approvalChannelId: string;
  notifyOnIssueCreated: boolean;
  notifyOnApprovalRequired: boolean;
  notifyOnBudgetAlert: boolean;
}

async function getConfig(ctx: PluginContext): Promise<SlackConfig> {
  const config = await ctx.config.get();
  return {
    botToken: (config.botToken as string) ?? "",
    defaultChannelId: (config.defaultChannelId as string) ?? "",
    approvalChannelId: (config.approvalChannelId as string) ?? "",
    notifyOnIssueCreated: config.notifyOnIssueCreated !== false,
    notifyOnApprovalRequired: config.notifyOnApprovalRequired !== false,
    notifyOnBudgetAlert: config.notifyOnBudgetAlert !== false,
  };
}

async function handleCommand(ctx: PluginContext, command: string, args: string[]): Promise<string | null> {
  switch (command) {
    case "/status": {
      const agents = await ctx.agents.list({ companyId: "", limit: 100, offset: 0 });
      const active = agents.filter((a: any) => a.status === "active").length;
      return `:bar_chart: *Status:* ${active}/${agents.length} agents active`;
    }
    case "/issues": {
      const issues = await ctx.issues.list({ companyId: "", limit: 10, offset: 0 });
      if (issues.length === 0) return "No issues found.";
      const list = issues.map((i: any) => `• ${i.displayId ?? ""} ${i.title}`).join("\n");
      return `:clipboard: *Recent Issues:*\n${list}`;
    }
    case "/help":
      return [
        ":robot_face: *Paperclip Bot Commands:*",
        "`/status` — Show agent status",
        "`/issues` — List recent issues",
        "`/help` — Show this help",
      ].join("\n");
    default:
      return null;
  }
}

async function postSlackMessage(botToken: string, channelId: string, msg: { text: string; blocks?: unknown[]; thread_ts?: string }): Promise<void> {
  if (!botToken || !channelId) return;
  await slackApiCall(botToken, "chat.postMessage", { channel: channelId, ...msg });
}

async function slackApiCall(botToken: string, method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${botToken}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default plugin;
runWorker(plugin, import.meta.url);
