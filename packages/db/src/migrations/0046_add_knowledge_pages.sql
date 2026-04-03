CREATE TABLE "knowledge_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL DEFAULT '',
	"format" text NOT NULL DEFAULT 'markdown',
	"parent_page_id" uuid,
	"tags" jsonb NOT NULL DEFAULT '[]',
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"updated_by_agent_id" uuid,
	"updated_by_user_id" text,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_page_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"body" text NOT NULL,
	"change_summary" text,
	"created_by_agent_id" uuid,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_page_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_page_id" uuid NOT NULL,
	"target_page_id" uuid NOT NULL,
	"link_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_pages" ADD CONSTRAINT "knowledge_pages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_pages" ADD CONSTRAINT "knowledge_pages_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_pages" ADD CONSTRAINT "knowledge_pages_updated_by_agent_id_agents_id_fk" FOREIGN KEY ("updated_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_page_revisions" ADD CONSTRAINT "knowledge_page_revisions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_page_revisions" ADD CONSTRAINT "knowledge_page_revisions_page_id_knowledge_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."knowledge_pages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_page_revisions" ADD CONSTRAINT "knowledge_page_revisions_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_page_links" ADD CONSTRAINT "knowledge_page_links_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_page_links" ADD CONSTRAINT "knowledge_page_links_source_page_id_knowledge_pages_id_fk" FOREIGN KEY ("source_page_id") REFERENCES "public"."knowledge_pages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_page_links" ADD CONSTRAINT "knowledge_page_links_target_page_id_knowledge_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."knowledge_pages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_pages_company_slug_uq" ON "knowledge_pages" USING btree ("company_id","slug");
--> statement-breakpoint
CREATE INDEX "knowledge_pages_company_parent_idx" ON "knowledge_pages" USING btree ("company_id","parent_page_id");
--> statement-breakpoint
CREATE INDEX "knowledge_pages_company_updated_idx" ON "knowledge_pages" USING btree ("company_id","updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_page_revisions_page_revision_uq" ON "knowledge_page_revisions" USING btree ("page_id","revision_number");
--> statement-breakpoint
CREATE INDEX "knowledge_page_revisions_company_page_created_idx" ON "knowledge_page_revisions" USING btree ("company_id","page_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_page_links_source_target_uq" ON "knowledge_page_links" USING btree ("source_page_id","target_page_id");
--> statement-breakpoint
CREATE INDEX "knowledge_page_links_company_source_idx" ON "knowledge_page_links" USING btree ("company_id","source_page_id");
--> statement-breakpoint
CREATE INDEX "knowledge_page_links_company_target_idx" ON "knowledge_page_links" USING btree ("company_id","target_page_id");
