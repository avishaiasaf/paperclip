import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "paperclip.telegram";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Telegram Integration",
  description: "Connect Paperclip to Telegram — receive notifications, send commands, and let agents message your team.",
  author: "Paperclip",
  categories: ["connector", "automation"],
  capabilities: [
    "events.subscribe",
    "events.emit",
    "plugin.state.read",
    "plugin.state.write",
    "issues.read",
    "issues.create",
    "agents.read",
    "goals.read",
    "activity.log.write",
    "webhooks.receive",
    "http.outbound",
    "secrets.read-ref",
    "agent.tools.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
  },
  instanceConfigSchema: {
    type: "object",
    properties: {
      botToken: {
        type: "string",
        title: "Telegram Bot Token",
        description: "Bot token from @BotFather (stored as secret reference)",
      },
      defaultChatId: {
        type: "string",
        title: "Default Chat ID",
        description: "Telegram chat/group ID for notifications",
      },
      notifyOnIssueCreated: {
        type: "boolean",
        title: "Notify on Issue Created",
        default: true,
      },
      notifyOnApprovalRequired: {
        type: "boolean",
        title: "Notify on Approval Required",
        default: true,
      },
      notifyOnAgentStatusChange: {
        type: "boolean",
        title: "Notify on Agent Status Change",
        default: false,
      },
      notifyOnBudgetAlert: {
        type: "boolean",
        title: "Notify on Budget Alert",
        default: true,
      },
    },
    required: ["botToken"],
  },
  webhooks: [
    {
      endpointKey: "telegram-update",
      displayName: "Telegram Webhook Updates",
      description: "Receives updates from Telegram Bot API",
    },
  ],
  tools: [
    {
      name: "send-telegram-message",
      displayName: "Send Telegram Message",
      description: "Send a message to the configured Telegram chat",
      parametersSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "The message text (supports Markdown)" },
          chatId: { type: "string", description: "Optional override chat ID" },
        },
        required: ["message"],
      },
    },
  ],
  jobs: [
    {
      jobKey: "telegram-poll",
      displayName: "Poll Telegram Updates",
      description: "Polls for Telegram updates (fallback when webhook is not configured)",
      schedule: "*/1 * * * *",
    },
  ],
};

export default manifest;
