CREATE TABLE IF NOT EXISTS "custom_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE IF EXISTS "faqs" ADD COLUMN IF NOT EXISTS "order" integer;
--> statement-breakpoint
WITH ranked AS (
	SELECT
		"id",
		row_number() OVER (PARTITION BY "section_id" ORDER BY "created_at", "id") - 1 AS "next_order"
	FROM "faqs"
)
UPDATE "faqs"
SET "order" = ranked."next_order"
FROM ranked
WHERE "faqs"."id" = ranked."id"
AND "faqs"."order" IS NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "faqs" ALTER COLUMN "order" SET DEFAULT 0;
--> statement-breakpoint
UPDATE "faqs" SET "order" = 0 WHERE "order" IS NULL;
--> statement-breakpoint
ALTER TABLE IF EXISTS "faqs" ALTER COLUMN "order" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_section_id_order_idx" ON "faqs" ("section_id","order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "faqs" ADD CONSTRAINT "faqs_section_id_sections_id_fk"
	FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id")
	ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;