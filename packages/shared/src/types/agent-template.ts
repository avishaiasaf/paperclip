export interface AgentTemplate {
  id: string;
  companyId: string | null;
  name: string;
  department: string;
  role: string;
  title: string | null;
  icon: string | null;
  persona: string;
  capabilities: string | null;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  runtimeConfig: Record<string, unknown>;
  suggestedGoals: Array<{ title: string; description?: string }>;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const AGENT_TEMPLATE_DEPARTMENTS = [
  "executive",
  "engineering",
  "product",
  "design",
  "devops",
  "marketing",
  "sales",
  "hr",
  "finance",
  "operations",
  "security",
  "analytics",
] as const;

export type AgentTemplateDepartment = (typeof AGENT_TEMPLATE_DEPARTMENTS)[number];
