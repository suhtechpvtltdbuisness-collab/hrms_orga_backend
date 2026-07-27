CREATE TABLE IF NOT EXISTS "appraisal_template" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "title" varchar(255) NOT NULL,
  "description" text,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "appraisal_template_goal" (
  "id" serial PRIMARY KEY NOT NULL,
  "template_id" integer NOT NULL REFERENCES "appraisal_template"("id") ON DELETE CASCADE,
  "sr_no" varchar(20),
  "kra" varchar(255) NOT NULL,
  "weightage" numeric(10,2) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "appraisal" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "series" varchar(100) DEFAULT 'HR-APR' NOT NULL,
  "template_id" integer REFERENCES "appraisal_template"("id"),
  "emp_id" integer NOT NULL REFERENCES "employee"("user_id"),
  "department_id" integer REFERENCES "department"("id"),
  "status" varchar(50) DEFAULT 'Draft' NOT NULL,
  "start_date" varchar(50),
  "end_date" varchar(50),
  "remarks" text,
  "total_score" numeric(10,3) DEFAULT '0' NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "appraisal_goal" (
  "id" serial PRIMARY KEY NOT NULL,
  "appraisal_id" integer NOT NULL REFERENCES "appraisal"("id") ON DELETE CASCADE,
  "template_goal_id" integer REFERENCES "appraisal_template_goal"("id"),
  "sr_no" varchar(20),
  "goal" varchar(255) NOT NULL,
  "weightage" numeric(10,2) DEFAULT '0' NOT NULL,
  "score" numeric(5,2) DEFAULT '0' NOT NULL,
  "earned" numeric(10,3) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "energy_point_rule" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "rule_name" varchar(255) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "reference_document_type" varchar(255),
  "for_document_event" varchar(50) DEFAULT 'Custom' NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "allot_points_to_user" boolean DEFAULT false NOT NULL,
  "user_field" varchar(100) DEFAULT 'Owner',
  "multiplier_field" varchar(255),
  "apply_only_once" boolean DEFAULT false NOT NULL,
  "condition" text,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "energy_point_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "emp_id" integer NOT NULL REFERENCES "employee"("user_id"),
  "rule_id" integer REFERENCES "energy_point_rule"("id"),
  "status" varchar(50) DEFAULT 'Auto' NOT NULL,
  "points" integer DEFAULT 0 NOT NULL,
  "reference_document_type" varchar(255),
  "reference_document_id" varchar(255),
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "energy_point_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL UNIQUE REFERENCES "organizations"("id"),
  "enabled" boolean DEFAULT false NOT NULL,
  "allocation_period" varchar(100) DEFAULT 'Weekly',
  "last_allocation_date" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "energy_point_review_level" (
  "id" serial PRIMARY KEY NOT NULL,
  "settings_id" integer NOT NULL REFERENCES "energy_point_settings"("id") ON DELETE CASCADE,
  "level_name" varchar(100) NOT NULL,
  "role" varchar(255) NOT NULL,
  "review_points" integer DEFAULT 0 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "appraisal_template_org_idx" ON "appraisal_template" ("organization_id");
CREATE INDEX IF NOT EXISTS "appraisal_template_goal_template_idx" ON "appraisal_template_goal" ("template_id");
CREATE INDEX IF NOT EXISTS "appraisal_org_idx" ON "appraisal" ("organization_id");
CREATE INDEX IF NOT EXISTS "appraisal_emp_idx" ON "appraisal" ("emp_id");
CREATE INDEX IF NOT EXISTS "appraisal_goal_appraisal_idx" ON "appraisal_goal" ("appraisal_id");
CREATE INDEX IF NOT EXISTS "energy_point_rule_org_idx" ON "energy_point_rule" ("organization_id");
CREATE INDEX IF NOT EXISTS "energy_point_log_org_idx" ON "energy_point_log" ("organization_id");
CREATE INDEX IF NOT EXISTS "energy_point_log_emp_idx" ON "energy_point_log" ("emp_id");
CREATE INDEX IF NOT EXISTS "energy_point_log_rule_idx" ON "energy_point_log" ("rule_id");
