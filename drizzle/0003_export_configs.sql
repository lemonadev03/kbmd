CREATE TABLE "export_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "export_configs_org_id_idx" ON "export_configs" ("org_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "export_configs_org_id_name_key" ON "export_configs" ("org_id","name");
--> statement-breakpoint
ALTER TABLE "export_configs" ADD CONSTRAINT "export_configs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
