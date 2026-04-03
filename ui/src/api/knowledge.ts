import type { KnowledgePage, KnowledgePageSummary, KnowledgePageRevision } from "@paperclipai/shared";
import { api } from "./client";

export const knowledgeApi = {
  list: (companyId: string, parentPageId?: string | null) => {
    const params = new URLSearchParams();
    if (parentPageId !== undefined) params.set("parentPageId", parentPageId === null ? "null" : parentPageId);
    const qs = params.toString();
    return api.get<KnowledgePageSummary[]>(`/companies/${companyId}/knowledge${qs ? `?${qs}` : ""}`);
  },

  search: (companyId: string, query: string) =>
    api.get<KnowledgePageSummary[]>(`/companies/${companyId}/knowledge?q=${encodeURIComponent(query)}`),

  get: (pageId: string) => api.get<KnowledgePage>(`/knowledge/${pageId}`),

  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<KnowledgePage>(`/companies/${companyId}/knowledge`, data),

  update: (pageId: string, data: Record<string, unknown>) =>
    api.patch<KnowledgePage>(`/knowledge/${pageId}`, data),

  archive: (pageId: string) => api.delete<KnowledgePage>(`/knowledge/${pageId}`),

  listRevisions: (pageId: string) =>
    api.get<KnowledgePageRevision[]>(`/knowledge/${pageId}/revisions`),

  getRevision: (pageId: string, revisionId: string) =>
    api.get<KnowledgePageRevision>(`/knowledge/${pageId}/revisions/${revisionId}`),

  getBacklinks: (pageId: string) =>
    api.get<Array<{ id: string; slug: string; title: string; linkText: string | null }>>(`/knowledge/${pageId}/backlinks`),
};
