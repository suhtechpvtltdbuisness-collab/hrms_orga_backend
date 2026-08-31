DO $$ BEGIN
  CREATE TYPE "project_status" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "project_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "project_management_project" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" "project_status" NOT NULL DEFAULT 'TODO',
  "priority" "project_priority" NOT NULL DEFAULT 'MEDIUM',
  "owner_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "progress" integer NOT NULL DEFAULT 0,
  "start_date" varchar(50),
  "due_date" varchar(50),
  "is_archived" boolean NOT NULL DEFAULT false,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_management_member" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "project_management_project"("id") ON DELETE CASCADE,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(50) NOT NULL DEFAULT 'MEMBER',
  "added_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "project_management_member_project_user_unique" UNIQUE ("project_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "project_management_task" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "project_management_project"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" "project_status" NOT NULL DEFAULT 'TODO',
  "priority" "project_priority" NOT NULL DEFAULT 'MEDIUM',
  "assignee_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "start_date" varchar(50),
  "due_date" varchar(50),
  "progress" integer NOT NULL DEFAULT 0,
  "is_archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "project_management_activity" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "project_management_project"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "actor_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "entity_type" varchar(50) NOT NULL DEFAULT 'PROJECT',
  "entity_id" integer,
  "type" varchar(80) NOT NULL,
  "message" text NOT NULL,
  "meta" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_management_project_org_idx"
  ON "project_management_project" ("organization_id", "is_archived");

CREATE INDEX IF NOT EXISTS "project_management_project_owner_idx"
  ON "project_management_project" ("owner_id");

CREATE INDEX IF NOT EXISTS "project_management_member_project_idx"
  ON "project_management_member" ("project_id");

CREATE INDEX IF NOT EXISTS "project_management_member_user_idx"
  ON "project_management_member" ("user_id");

CREATE INDEX IF NOT EXISTS "project_management_task_project_idx"
  ON "project_management_task" ("project_id", "is_archived");

CREATE INDEX IF NOT EXISTS "project_management_task_assignee_idx"
  ON "project_management_task" ("assignee_id");

CREATE INDEX IF NOT EXISTS "project_management_activity_project_idx"
  ON "project_management_activity" ("project_id", "created_at");
