import { pgTable, uuid, text, timestamp, index, boolean, jsonb } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const agentTemplates = pgTable(
  "agent_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    department: text("department").notNull(),
    role: text("role").notNull(),
    title: text("title"),
    icon: text("icon"),
    persona: text("persona").notNull(),
    capabilities: text("capabilities"),
    adapterType: text("adapter_type").notNull().default("claude_local"),
    adapterConfig: jsonb("adapter_config").notNull().default({}),
    runtimeConfig: jsonb("runtime_config").notNull().default({}),
    suggestedGoals: jsonb("suggested_goals").notNull().default([]),
    isBuiltIn: boolean("is_built_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyDeptIdx: index("agent_templates_company_dept_idx").on(table.companyId, table.department),
    deptIdx: index("agent_templates_dept_idx").on(table.department),
  }),
);
