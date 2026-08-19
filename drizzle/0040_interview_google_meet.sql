ALTER TABLE "interview"
  ADD COLUMN IF NOT EXISTS "google_event_id" varchar(255),
  ADD COLUMN IF NOT EXISTS "meeting_code" varchar(64),
  ADD COLUMN IF NOT EXISTS "interview_type" varchar(100),
  ADD COLUMN IF NOT EXISTS "interview_mode" varchar(50),
  ADD COLUMN IF NOT EXISTS "panel" varchar(50),
  ADD COLUMN IF NOT EXISTS "scheduled_by" integer REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(128) UNIQUE;

ALTER TABLE "interview"
  ALTER COLUMN "meeting_link" TYPE varchar(512);

CREATE TABLE IF NOT EXISTS "google_calendar_connection" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id"),
  "google_email" varchar(255),
  "refresh_token" text NOT NULL,
  "access_token" text,
  "token_expiry" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
