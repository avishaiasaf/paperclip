import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { knowledgePages } from "./knowledge_pages.js";

export const knowledgePageRevisions = pgTable(
  "knowledge_page_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    pageId: uuid("page_id").notNull().references(() => knowledgePages.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    body: text("body").notNull(),
    changeSummary: text("change_summary"),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pageRevisionUq: uniqueIndex("knowledge_page_revisions_page_revision_uq").on(
      table.pageId,
      table.revisionNumber,
    ),
    companyPageCreatedIdx: index("knowledge_page_revisions_company_page_created_idx").on(
      table.companyId,
      table.pageId,
      table.createdAt,
    ),
  }),
);
