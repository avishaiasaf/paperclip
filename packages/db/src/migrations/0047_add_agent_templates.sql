CREATE TABLE "agent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"role" text NOT NULL,
	"title" text,
	"icon" text,
	"persona" text NOT NULL,
	"capabilities" text,
	"adapter_type" text NOT NULL DEFAULT 'claude_local',
	"adapter_config" jsonb NOT NULL DEFAULT '{}',
	"runtime_config" jsonb NOT NULL DEFAULT '{}',
	"suggested_goals" jsonb NOT NULL DEFAULT '[]',
	"is_built_in" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "agent_templates_company_dept_idx" ON "agent_templates" USING btree ("company_id","department");
--> statement-breakpoint
CREATE INDEX "agent_templates_dept_idx" ON "agent_templates" USING btree ("department");
