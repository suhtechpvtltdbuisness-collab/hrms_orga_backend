CREATE TABLE IF NOT EXISTS "announcement" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "content" text NOT NULL,
  "type" varchar(100) DEFAULT 'Company Update' NOT NULL,
  "priority" varchar(50) DEFAULT 'Normal' NOT NULL,
  "audience" varchar(100) DEFAULT 'All Employees' NOT NULL,
  "departments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "employees" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "author" varchar(255) NOT NULL,
  "status" varchar(50) DEFAULT 'Draft' NOT NULL,
  "published_at" timestamp,
  "scheduled_at" timestamp,
  "expiry_date" varchar(50),
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "recipients" integer DEFAULT 0 NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "announcement_read" (
  "id" serial PRIMARY KEY NOT NULL,
  "announcement_id" integer NOT NULL REFERENCES "announcement"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "read_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "announcement_read_announcement_id_user_id_unique" UNIQUE ("announcement_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "announcement_org_status_idx" ON "announcement" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "announcement_org_created_idx" ON "announcement" ("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "announcement_read_user_idx" ON "announcement_read" ("user_id", "announcement_id");
CREATE INDEX IF NOT EXISTS "announcement_read_announcement_idx" ON "announcement_read" ("announcement_id");
