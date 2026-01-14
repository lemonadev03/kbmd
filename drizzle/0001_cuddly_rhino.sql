CREATE TABLE "phase_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "phase_group_id" uuid;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "phase_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_phase_group_id_phase_groups_id_fk" FOREIGN KEY ("phase_group_id") REFERENCES "public"."phase_groups"("id") ON DELETE set null ON UPDATE no action;