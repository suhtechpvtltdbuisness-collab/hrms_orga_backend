ALTER TYPE "public"."plan_type" ADD VALUE 'starter_pack' BEFORE 'basic';--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN "plan_type" "plan_type" DEFAULT 'free_trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN "max_employees" integer DEFAULT 4 NOT NULL;