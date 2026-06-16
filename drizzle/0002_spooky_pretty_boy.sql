ALTER TABLE "attendance" ADD COLUMN "series" varchar(50);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "shift" varchar(255);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "late_entry" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "early_exit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "attendance" SET "series" = 'HR-ATT-' || to_char("created_at", 'YYYY') || '-' || lpad("id"::text, 3, '0') WHERE "series" IS NULL;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "series" SET NOT NULL;
