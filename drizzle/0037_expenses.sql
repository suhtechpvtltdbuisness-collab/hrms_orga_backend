CREATE TABLE IF NOT EXISTS "expense_category" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "name" varchar(255) NOT NULL,
  "linked_account" varchar(255),
  "monthly_budget" numeric(14,2),
  "daily_limit" numeric(14,2),
  "approval" varchar(50) DEFAULT 'Not Required' NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "expense" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
  "title" varchar(255) NOT NULL,
  "description" text,
  "category" varchar(255) NOT NULL,
  "category_id" integer REFERENCES "expense_category"("id"),
  "amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "expense_date" varchar(50) NOT NULL,
  "payment_type" varchar(100),
  "bill" text,
  "status" varchar(50) DEFAULT 'Submitted' NOT NULL,
  "employee_name" varchar(255),
  "cost_center" varchar(120),
  "department_id" integer REFERENCES "department"("id"),
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "expense_org_date_idx" ON "expense" ("organization_id", "expense_date");
CREATE INDEX IF NOT EXISTS "expense_org_status_idx" ON "expense" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "expense_category_org_idx" ON "expense_category" ("organization_id");
