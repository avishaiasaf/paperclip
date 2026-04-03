import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import type { PluginContext, PluginWebhookInput, ToolResult } from "@paperclipai/plugin-sdk";

const TELEGRAM_API = "https://api.telegram.org";

let currentCtx: PluginContext | null = null;

const plugin = definePlugin({
  async setup(ctx) {
    currentCtx = ctx;
    ctx.logger.info("Telegram plugin setup complete");

    ctx.events.on("issue.created", async (event) => {
      const config = await getConfig(ctx);
      if (!config.notifyOnIssueCreated || !config.defaultChatId) return;
      const p = event.payload as Record<string, unknown> | undefined;
      await sendMessage(config, `📋 *New Issue:* ${p?.displayId ?? ""} ${p?.title ?? "Untitled"}`);
    });

    ctx.events.on("approval.created", async (event) => {
      const config = await getConfig(ctx);
      if (!config.notifyOnApprovalRequired || !config.defaultChatId) return;
      await sendMessage(config, `✅ *Approval Required:* ${event.entityId?.slice(0, 8) ?? ""}`);
    });

    ctx.events.on("cost_event.created", async (event) => {
      const config = await getConfig(ctx);
      if (!config.notifyOnBudgetAlert || !config.defaultChatId) return;
      const p = event.payload as Record<string, unknown> | undefined;
      if (p?.budgetExceeded) {
        await sendMessage(config, `💰 *Budget Alert:* ${p?.agentName ?? "Agent"} exceeded budget`);
      }
    });

    ctx.tools.register(
      "send-telegram-message",
      {
        displayName: "Send Telegram Message",
        description: "Send a message to the configured Telegram chat",
        parametersSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
            chatId: { type: "string" },
          },
          required: ["message"],
        },
      },
      async (params, runCtx): Promise<ToolResult> => {
        const config = await getConfig(ctx);
        const typed = params as { message: string; chatId?: string };
        const chatId = typed.chatId ?? config.defaultChatId;
        if (!chatId) return { content: "Error: No chat ID configured" };
        await sendTelegramMessage(config.botToken, chatId, typed.message);
        return { content: "Message sent to Telegram" };
      },
    );

    ctx.jobs.register("telegram-poll", async () => {
      const config = await getConfig(ctx);
      if (!config.botToken) return;

      const lastState = await ctx.state.get({ scopeKind: "instance", stateKey: "lastUpdateId" });
      const lastUpdateId = (lastState as number) ?? 0;
      const res = await fetch(
        `${TELEGRAM_API}/bot${config.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=0`,
      );
      const data = (await res.json()) as {
        ok: boolean;
        result: Array<{ update_id: number; message?: Record<string, unknown> }>;
      };
      if (!data.ok || !data.result.length) return;

      for (const update of data.result) {
        if (update.message) {
          const text = (update.message.text as string) ?? "";
          const chatId = String((update.message.chat as Record<string, unknown>)?.id ?? "");
          if (text.startsWith("/")) {
            const [command, ...args] = text.split(" ");
            const response = await handleCommand(ctx, config, command, args);
            if (response) await sendTelegramMessage(config.botToken, chatId, response);
          }
        }
        await ctx.state.set({ scopeKind: "instance", stateKey: "lastUpdateId" }, update.update_id);
      }
    });
  },

  async onHealth() {
    return { status: "ok", message: "Telegram plugin ready" };
  },

  async onWebhook(input: PluginWebhookInput) {
    const ctx = currentCtx;
    if (!ctx) return;

    const body = input.parsedBody as Record<string, unknown> | undefined;
    if (!body?.message) return;

    const message = body.message as Record<string, unknown>;
    const text = (message.text as string) ?? "";
    const chatId = String((message.chat as Record<string, unknown>)?.id ?? "");
    if (!text.startsWith("/")) return;

    const config = await getConfig(ctx);
    const [command, ...args] = text.split(" ");
    const response = await handleCommand(ctx, config, command, args);
    if (response) await sendTelegramMessage(config.botToken, chatId, response);
  },
});

interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
  notifyOnIssueCreated: boolean;
  notifyOnApprovalRequired: boolean;
  notifyOnBudgetAlert: boolean;
}

async function getConfig(ctx: PluginContext): Promise<TelegramConfig> {
  const config = await ctx.config.get();
  return {
    botToken: (config.botToken as string) ?? "",
    defaultChatId: (config.defaultChatId as string) ?? "",
    notifyOnIssueCreated: config.notifyOnIssueCreated !== false,
    notifyOnApprovalRequired: config.notifyOnApprovalRequired !== false,
    notifyOnBudgetAlert: config.notifyOnBudgetAlert !== false,
  };
}

async function handleCommand(ctx: PluginContext, config: TelegramConfig, command: string, args: string[]): Promise<string | null> {
  switch (command) {
    case "/status": {
      const agents = await ctx.agents.list({ companyId: "", limit: 100, offset: 0 });
      const active = agents.filter((a) => (a as any).status === "active").length;
      return `📊 *Status:* ${active}/${agents.length} agents active`;
    }
    case "/issues": {
      const issues = await ctx.issues.list({ companyId: "", limit: 10, offset: 0 });
      if (issues.length === 0) return "No issues found.";
      const list = issues.map((i: any) => `• ${i.displayId ?? ""} ${i.title}`).join("\n");
      return `📋 *Recent Issues:*\n${list}`;
    }
    case "/help":
      return [
        "🤖 *Paperclip Bot Commands:*",
        "/status — Show agent status",
        "/issues — List recent issues",
        "/help — Show this help",
      ].join("\n");
    default:
      return null;
  }
}

async function sendMessage(config: TelegramConfig, text: string) {
  await sendTelegramMessage(config.botToken, config.defaultChatId, text);
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
  if (!botToken || !chatId) return;
  await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

export default plugin;
runWorker(plugin, import.meta.url);
