import { z } from "zod";

export const createKnowledgePageSchema = z.object({
  slug: z.string().min(1).max(500),
  title: z.string().min(1).max(500),
  body: z.string().optional().default(""),
  format: z.enum(["markdown", "tiptap"]).optional().default("markdown"),
  parentPageId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  publish: z.boolean().optional().default(true),
});

export type CreateKnowledgePage = z.infer<typeof createKnowledgePageSchema>;

export const updateKnowledgePageSchema = z.object({
  slug: z.string().min(1).max(500).optional(),
  title: z.string().min(1).max(500).optional(),
  body: z.string().optional(),
  format: z.enum(["markdown", "tiptap"]).optional(),
  parentPageId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  changeSummary: z.string().max(500).optional(),
});

export type UpdateKnowledgePage = z.infer<typeof updateKnowledgePageSchema>;
