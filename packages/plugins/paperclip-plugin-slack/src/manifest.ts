import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "paperclip.slack";
const PLUGIN_VERSION = "0.1.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Slack Integration",
  description: "Connect Paperclip to Slack — post updates, approve work via buttons, and interact with agents from Slack channels.",
  author: "Paperclip",
  categories: ["connector", "automation"],
  capabilities: [
    "events.subscribe",
    "events.emit",
    "plugin.state.read",
    "plugin.state.write",
    "issues.read",
    "issues.create",
    "issues.update",
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
        title: "Slack Bot Token",
        description: "Bot User OAuth Token (xoxb-...)",
      },
      signingSecret: {
        type: "string",
        title: "Slack Signing Secret",
        description: "Used to verify webhook requests from Slack",
      },
      defaultChannelId: {
        type: "string",
        title: "Default Channel ID",
        description: "Slack channel ID for notifications (e.g. C01234ABCDE)",
      },
      approvalChannelId: {
        type: "string",
        title: "Approval Channel ID",
        description: "Channel for approval requests with interactive buttons",
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
      notifyOnBudgetAlert: {
        type: "boolean",
        title: "Notify on Budget Alert",
        default: true,
      },
    },
    required: ["botToken", "signingSecret"],
  },
  webhooks: [
    {
      endpointKey: "slack-events",
      displayName: "Slack Events API",
      description: "Receives events from Slack Events API (messages, app_mention, etc.)",
    },
    {
      endpointKey: "slack-interactions",
      displayName: "Slack Interactions",
      description: "Receives interactive component payloads (button clicks, modals)",
    },
  ],
  tools: [
    {
      name: "send-slack-message",
      displayName: "Send Slack Message",
      description: "Send a message to a Slack channel",
      parametersSchema: {
        type: "object",
        properties: {
          message: { type: "string", description: "Message text (supports Slack mrkdwn)" },
          channelId: { type: "string", description: "Optional channel ID override" },
          threadTs: { type: "string", description: "Optional thread timestamp for replies" },
        },
        required: ["message"],
      },
    },
    {
      name: "add-slack-reaction",
      displayName: "Add Slack Reaction",
      description: "Add an emoji reaction to a Slack message",
      parametersSchema: {
        type: "object",
        properties: {
          emoji: { type: "string", description: "Emoji name without colons (e.g. 'thumbsup')" },
          channelId: { type: "string" },
          messageTs: { type: "string" },
        },
        required: ["emoji", "channelId", "messageTs"],
      },
    },
  ],
};

export default manifest;
