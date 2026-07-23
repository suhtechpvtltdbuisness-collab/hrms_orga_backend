DO $$ BEGIN
  CREATE TYPE "attendance_request_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "attendance_request" (
  "id" serial PRIMARY KEY NOT NULL,
  "emp_id" integer NOT NULL REFERENCES "employee"("user_id"),
  "from_date" date NOT NULL,
  "to_date" date NOT NULL,
  "request_type" varchar(120) NOT NULL,
  "is_half_day" boolean DEFAULT false NOT NULL,
  "explanation" text NOT NULL,
  "status" "attendance_request_status" DEFAULT 'pending' NOT NULL,
  "reviewed_by" integer REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "rejection_reason" text,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "attendance_request_emp_id_idx" ON "attendance_request" ("emp_id");
CREATE INDEX IF NOT EXISTS "attendance_request_status_idx" ON "attendance_request" ("status");
