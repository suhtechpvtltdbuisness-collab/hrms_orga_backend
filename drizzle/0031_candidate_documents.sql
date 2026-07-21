ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "document_upload_token" varchar(128);
ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "candidate_documents" text;
ALTER TABLE "job_application" ADD COLUMN IF NOT EXISTS "candidate_profile" text;
CREATE UNIQUE INDEX IF NOT EXISTS "job_application_document_upload_token_unique" ON "job_application" ("document_upload_token");
