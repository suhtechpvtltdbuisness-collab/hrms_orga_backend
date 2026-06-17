ALTER TYPE "public"."plan_type" ADD VALUE IF NOT EXISTS 'starter_pack';--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN IF NOT EXISTS "plan_type" "plan_type" DEFAULT 'free_trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN IF NOT EXISTS "max_employees" integer DEFAULT 4 NOT NULL;
