-- Financial reporting structure: statement classification for the chart of
-- accounts, reporting dimensions on journal lines, fiscal years and budgets.

ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "statement_section" varchar(40);
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "cash_flow_activity" varchar(20);
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "report_category" varchar(120);

ALTER TABLE "journal_entry_line" ADD COLUMN IF NOT EXISTS "department_id" integer REFERENCES "department"("id");
ALTER TABLE "journal_entry_line" ADD COLUMN IF NOT EXISTS "cost_center" varchar(120);
ALTER TABLE "journal_entry_line" ADD COLUMN IF NOT EXISTS "description" text;

CREATE TABLE IF NOT EXISTS "fiscal_year" (
  "id" serial PRIMARY KEY NOT NULL,
  "admin_id" integer NOT NULL REFERENCES "users"("id"),
  "name" varchar(120) NOT NULL,
  "start_date" varchar(50) NOT NULL,
  "end_date" varchar(50) NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_closed" boolean DEFAULT false NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "budget" (
  "id" serial PRIMARY KEY NOT NULL,
  "admin_id" integer NOT NULL REFERENCES "users"("id"),
  "name" varchar(255) NOT NULL,
  "fiscal_year_id" integer REFERENCES "fiscal_year"("id"),
  "period_start" varchar(50) NOT NULL,
  "period_end" varchar(50) NOT NULL,
  "status" varchar(30) DEFAULT 'Draft' NOT NULL,
  "notes" text,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "budget_line" (
  "id" serial PRIMARY KEY NOT NULL,
  "budget_id" integer NOT NULL REFERENCES "budget"("id") ON DELETE CASCADE,
  "department_id" integer REFERENCES "department"("id"),
  "account_id" integer REFERENCES "chart_account"("id"),
  "category_name" varchar(255) NOT NULL,
  "budgeted_amount" numeric(15,2) DEFAULT '0' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "journal_entry_line_account_idx" ON "journal_entry_line" ("account_id");
CREATE INDEX IF NOT EXISTS "journal_entry_line_department_idx" ON "journal_entry_line" ("department_id");
CREATE INDEX IF NOT EXISTS "journal_entry_admin_date_idx" ON "journal_entry" ("admin_id", "entry_date");
CREATE INDEX IF NOT EXISTS "budget_line_budget_idx" ON "budget_line" ("budget_id");
CREATE INDEX IF NOT EXISTS "budget_admin_period_idx" ON "budget" ("admin_id", "period_start", "period_end");

-- Backfill classification for accounts created before this module existed.
UPDATE "chart_account" SET "statement_section" = CASE
    WHEN lower("account_type") = 'asset' THEN 'current_asset'
    WHEN lower("account_type") = 'liability' THEN 'current_liability'
    WHEN lower("account_type") = 'equity' THEN 'equity'
    WHEN lower("account_type") IN ('income', 'revenue') THEN 'revenue'
    WHEN lower("account_type") = 'expense' THEN 'indirect_expense'
    ELSE NULL
  END
WHERE "statement_section" IS NULL;

UPDATE "chart_account" SET "cash_flow_activity" = CASE
    WHEN "statement_section" IN ('non_current_asset') THEN 'investing'
    WHEN "statement_section" IN ('equity', 'non_current_liability') THEN 'financing'
    ELSE 'operating'
  END
WHERE "cash_flow_activity" IS NULL AND "statement_section" IS NOT NULL;
