ALTER TABLE "subscription_plan_definition"
  ADD COLUMN IF NOT EXISTS "price_usd" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "price_per_employee_usd" integer DEFAULT 0 NOT NULL;

UPDATE "subscription_plan_definition"
SET
  "name" = 'Free Trial',
  "description" = '1-month ORGA HRMS trial with the same limits as Starter — $1 per employee, up to 10 employees. Converts to Starter when the trial ends.',
  "price_inr" = 0,
  "price_per_employee_inr" = 0,
  "price_usd" = 0,
  "price_per_employee_usd" = 1,
  "duration_days" = 30,
  "max_employees" = 10,
  "organization_type" = 'startup',
  "features" = '["Full employee management","Leave & attendance","Up to 10 employees","Payroll basics","$1 per employee"]'::jsonb,
  "updated_at" = now()
WHERE "plan_type" = 'free_trial';

UPDATE "subscription_plan_definition"
SET
  "name" = 'Starter',
  "description" = '$1 per employee / month — up to 10 employees',
  "price_inr" = 510,
  "price_per_employee_inr" = 51,
  "price_usd" = 10,
  "price_per_employee_usd" = 1,
  "duration_days" = 30,
  "max_employees" = 10,
  "organization_type" = 'sme',
  "features" = '["Full employee management","Leave & attendance","Up to 10 employees","Payroll basics","$1 per employee"]'::jsonb,
  "razorpay_plan_id" = NULL,
  "updated_at" = now()
WHERE "plan_type" = 'starter_pack';

UPDATE "subscription_plan_definition"
SET
  "price_usd" = 19,
  "price_per_employee_usd" = 1,
  "updated_at" = now()
WHERE "plan_type" = 'premium' AND "price_usd" = 0;

UPDATE "subscription_plan_definition"
SET
  "price_usd" = 39,
  "price_per_employee_usd" = 1,
  "updated_at" = now()
WHERE "plan_type" = 'enterprise' AND "price_usd" = 0;
