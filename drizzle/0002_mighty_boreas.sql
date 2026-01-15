CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations" ("slug");
--> statement-breakpoint
CREATE TABLE "org_memberships" (
	"org_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "org_memberships_org_id_idx" ON "org_memberships" ("org_id");
--> statement-breakpoint
CREATE INDEX "org_memberships_user_id_idx" ON "org_memberships" ("user_id");
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_org_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_settings_last_org_idx" ON "user_settings" ("last_org_id");
--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_last_org_id_organizations_id_fk" FOREIGN KEY ("last_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "variables" ADD COLUMN "org_id" uuid;
--> statement-breakpoint
ALTER TABLE "phase_groups" ADD COLUMN "org_id" uuid;
--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "org_id" uuid;
--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "org_id" uuid;
--> statement-breakpoint
ALTER TABLE "custom_rules" ADD COLUMN "org_id" uuid;
--> statement-breakpoint
INSERT INTO "organizations" ("name", "slug", "created_at", "updated_at")
VALUES ('FMA', 'fma', now(), now());
--> statement-breakpoint
UPDATE "variables"
SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'fma');
--> statement-breakpoint
UPDATE "phase_groups"
SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'fma');
--> statement-breakpoint
UPDATE "sections"
SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'fma');
--> statement-breakpoint
UPDATE "faqs"
SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'fma');
--> statement-breakpoint
UPDATE "custom_rules"
SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'fma');
--> statement-breakpoint
INSERT INTO "org_memberships" ("org_id", "user_id", "role", "created_at")
SELECT o.id, u.id, 'admin', now()
FROM "organizations" o
JOIN "user" u ON true
WHERE o.slug = 'fma';
--> statement-breakpoint
INSERT INTO "user_settings" ("user_id", "last_org_id", "created_at", "updated_at")
SELECT u.id, o.id, now(), now()
FROM "organizations" o
JOIN "user" u ON true
WHERE o.slug = 'fma';
--> statement-breakpoint
ALTER TABLE "variables" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "phase_groups" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "sections" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "faqs" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_rules" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "variables" ADD CONSTRAINT "variables_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "phase_groups" ADD CONSTRAINT "phase_groups_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "custom_rules" ADD CONSTRAINT "custom_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "custom_rules_org_id_key" ON "custom_rules" ("org_id");
