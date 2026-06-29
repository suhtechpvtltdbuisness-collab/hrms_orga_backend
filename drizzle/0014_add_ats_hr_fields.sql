ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "hr_notes" text;
ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "ats_data" jsonb;
