import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { knowledgePages } from "./knowledge_pages.js";

export const knowledgePageLinks = pgTable(
  "knowledge_page_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    sourcePageId: uuid("source_page_id").notNull().references(() => knowledgePages.id, { onDelete: "cascade" }),
    targetPageId: uuid("target_page_id").notNull().references(() => knowledgePages.id, { onDelete: "cascade" }),
    linkText: text("link_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceTargetUq: uniqueIndex("knowledge_page_links_source_target_uq").on(
      table.sourcePageId,
      table.targetPageId,
    ),
    companySourceIdx: index("knowledge_page_links_company_source_idx").on(table.companyId, table.sourcePageId),
    companyTargetIdx: index("knowledge_page_links_company_target_idx").on(table.companyId, table.targetPageId),
  }),
);
