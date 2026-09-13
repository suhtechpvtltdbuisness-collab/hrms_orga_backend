CREATE TABLE IF NOT EXISTS "project_management_task_comment" (
  "id" serial PRIMARY KEY,
  "task_id" integer NOT NULL REFERENCES "project_management_task"("id") ON DELETE CASCADE,
  "project_id" integer NOT NULL REFERENCES "project_management_project"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "author_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "message" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "project_management_task_comment_task_idx"
  ON "project_management_task_comment" ("task_id", "created_at");

CREATE INDEX IF NOT EXISTS "project_management_task_comment_project_idx"
  ON "project_management_task_comment" ("project_id");
