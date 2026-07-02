ALTER TABLE "plain" ALTER COLUMN "plan_type" DROP DEFAULT;
ALTER TABLE "plain" ALTER COLUMN "plan_type" TYPE varchar(80) USING "plan_type"::text;
ALTER TABLE "plain" ALTER COLUMN "plan_type" SET DEFAULT 'free_trial';

CREATE TABLE IF NOT EXISTS "subscription_plan_definition" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_type" varchar(80) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" text NOT NULL,
  "price_inr" integer NOT NULL,
  "price_per_employee_inr" integer DEFAULT 0 NOT NULL,
  "duration_days" integer NOT NULL,
  "max_employees" integer NOT NULL,
  "module" varchar(50) DEFAULT 'hrms' NOT NULL,
  "organization_type" varchar(50) DEFAULT 'sme' NOT NULL,
  "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "razorpay_plan_id" varchar(255),
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "subscription_plan_definition"
  ("plan_type", "name", "description", "price_inr", "price_per_employee_inr", "duration_days", "max_employees", "module", "organization_type", "features", "sort_order")
VALUES
  ('free_trial', 'Free Trial', '7-day ORGA HRMS trial with up to 4 employees', 0, 0, 7, 4, 'hrms', 'startup', '["Employee management", "Attendance", "Leave management"]', 1),
  ('starter_pack', 'Starter', '₹299/month flat — up to 6 employees for small teams getting started', 299, 51, 30, 6, 'hrms', 'sme', '["Employee management", "Attendance", "Leave management", "Payroll"]', 2),
  ('premium', 'Growth', '₹499/month flat — up to 16 employees with the full HRMS workflow', 499, 51, 30, 16, 'hrms', 'enterprise', '["Full HRMS workflow", "Payroll", "Hiring", "Reports"]', 3),
  ('enterprise', 'Enterprise', '₹799/month flat — up to 26 employees for larger HRMS teams', 799, 51, 30, 26, 'hrms', 'enterprise', '["All Growth features", "Advanced controls", "Priority support"]', 4)
ON CONFLICT ("plan_type") DO NOTHING;
