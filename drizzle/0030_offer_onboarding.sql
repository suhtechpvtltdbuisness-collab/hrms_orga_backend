ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "onboarding_status" varchar(50) DEFAULT 'not_started' NOT NULL;
ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "onboarding_started_at" timestamp;
ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp;
ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "onboarding_tasks" text;
ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "employee_user_id" integer REFERENCES "users"("id");
ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "viewed_at" timestamp;
