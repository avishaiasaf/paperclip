import type { AgentTemplate } from "@paperclipai/shared";
import { api } from "./client";

export const agentTemplatesApi = {
  list: (companyId: string, department?: string) => {
    const params = department ? `?department=${encodeURIComponent(department)}` : "";
    return api.get<AgentTemplate[]>(`/companies/${companyId}/agent-templates${params}`);
  },
  get: (templateId: string) => api.get<AgentTemplate>(`/agent-templates/${templateId}`),
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<AgentTemplate>(`/companies/${companyId}/agent-templates`, data),
  update: (templateId: string, data: Record<string, unknown>) =>
    api.patch<AgentTemplate>(`/agent-templates/${templateId}`, data),
  remove: (templateId: string) => api.delete(`/agent-templates/${templateId}`),
};
