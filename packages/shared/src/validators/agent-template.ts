import { z } from "zod";

export const createAgentTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  department: z.string().min(1),
  role: z.string().min(1),
  title: z.string().max(200).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  persona: z.string().min(1),
  capabilities: z.string().optional().nullable(),
  adapterType: z.string().optional().default("claude_local"),
  adapterConfig: z.record(z.unknown()).optional().default({}),
  runtimeConfig: z.record(z.unknown()).optional().default({}),
  suggestedGoals: z.array(z.object({ title: z.string(), description: z.string().optional() })).optional().default([]),
});

export type CreateAgentTemplate = z.infer<typeof createAgentTemplateSchema>;

export const updateAgentTemplateSchema = createAgentTemplateSchema.partial();

export type UpdateAgentTemplate = z.infer<typeof updateAgentTemplateSchema>;
