ALTER TABLE "compensatory_leave_request" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_block" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_encashment_request" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_holiday" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_period" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_policy" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_policy_assignment" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint
ALTER TABLE "leave_type_config" ADD COLUMN IF NOT EXISTS "admin_id" integer;--> statement-breakpoint

UPDATE "leave_holiday"
SET "admin_id" = COALESCE(
  "created_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_holiday"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_holiday"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "leave_period"
SET "admin_id" = COALESCE(
  "created_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_period"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_period"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "leave_block"
SET "admin_id" = COALESCE(
  "created_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_block"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_block"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "leave_type_config"
SET "admin_id" = COALESCE(
  "created_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_type_config"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_type_config"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "leave_policy"
SET "admin_id" = COALESCE(
  "created_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_policy"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_policy"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "leave_policy_assignment"
SET "admin_id" = COALESCE(
  "assigned_by",
  (
    SELECT "leave_policy"."admin_id"
    FROM "leave_policy"
    WHERE "leave_policy"."id" = "leave_policy_assignment"."policy_id"
  ),
  (
    SELECT "employee"."admin_id"
    FROM "employee"
    WHERE "employee"."user_id" = "leave_policy_assignment"."emp_id"
  ),
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_policy_assignment"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_policy_assignment"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "compensatory_leave_request"
SET "admin_id" = COALESCE(
  (
    SELECT "employee"."admin_id"
    FROM "employee"
    WHERE "employee"."user_id" = "compensatory_leave_request"."emp_id"
  ),
  "reviewed_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "compensatory_leave_request"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "compensatory_leave_request"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

UPDATE "leave_encashment_request"
SET "admin_id" = COALESCE(
  (
    SELECT "employee"."admin_id"
    FROM "employee"
    WHERE "employee"."user_id" = "leave_encashment_request"."emp_id"
  ),
  "reviewed_by",
  (
    SELECT "created_by"
    FROM "organizations"
    WHERE "organizations"."id" = "leave_encashment_request"."organization_id"
  ),
  (
    SELECT "users"."id"
    FROM "users"
    WHERE "users"."organization_id" = "leave_encashment_request"."organization_id"
      AND ("users"."role_id" = 1 OR "users"."is_admin" = true)
    ORDER BY "users"."id"
    LIMIT 1
  )
)
WHERE "admin_id" IS NULL;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "leave_holiday" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_holiday.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "leave_period" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_period.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "leave_block" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_block.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "leave_type_config" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_type_config.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "leave_policy" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_policy.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "leave_policy_assignment" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_policy_assignment.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "compensatory_leave_request" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill compensatory_leave_request.admin_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "leave_encashment_request" WHERE "admin_id" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill leave_encashment_request.admin_id';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "compensatory_leave_request" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_block" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_encashment_request" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_holiday" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_period" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_policy" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_policy_assignment" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_type_config" ALTER COLUMN "admin_id" SET NOT NULL;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'compensatory_leave_request_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "compensatory_leave_request"
      ADD CONSTRAINT "compensatory_leave_request_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_block_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_block"
      ADD CONSTRAINT "leave_block_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_encashment_request_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_encashment_request"
      ADD CONSTRAINT "leave_encashment_request_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_holiday_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_holiday"
      ADD CONSTRAINT "leave_holiday_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_period_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_period"
      ADD CONSTRAINT "leave_period_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_policy_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_policy"
      ADD CONSTRAINT "leave_policy_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_policy_assignment_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_policy_assignment"
      ADD CONSTRAINT "leave_policy_assignment_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_type_config_admin_id_users_id_fk'
  ) THEN
    ALTER TABLE "leave_type_config"
      ADD CONSTRAINT "leave_type_config_admin_id_users_id_fk"
      FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "leave_holiday" DROP CONSTRAINT IF EXISTS "leave_holiday_org_date_name_unique";--> statement-breakpoint
ALTER TABLE "leave_period" DROP CONSTRAINT IF EXISTS "leave_period_org_name_unique";--> statement-breakpoint
ALTER TABLE "leave_policy" DROP CONSTRAINT IF EXISTS "leave_policy_org_name_unique";--> statement-breakpoint
ALTER TABLE "leave_type_config" DROP CONSTRAINT IF EXISTS "leave_type_config_org_name_unique";--> statement-breakpoint
ALTER TABLE "leave_type_config" DROP CONSTRAINT IF EXISTS "leave_type_config_org_code_unique";--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_holiday_admin_date_name_unique'
  ) THEN
    ALTER TABLE "leave_holiday"
      ADD CONSTRAINT "leave_holiday_admin_date_name_unique"
      UNIQUE("admin_id","holiday_date","name");
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_period_admin_name_unique'
  ) THEN
    ALTER TABLE "leave_period"
      ADD CONSTRAINT "leave_period_admin_name_unique"
      UNIQUE("admin_id","name");
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_policy_admin_name_unique'
  ) THEN
    ALTER TABLE "leave_policy"
      ADD CONSTRAINT "leave_policy_admin_name_unique"
      UNIQUE("admin_id","name");
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_type_config_admin_name_unique'
  ) THEN
    ALTER TABLE "leave_type_config"
      ADD CONSTRAINT "leave_type_config_admin_name_unique"
      UNIQUE("admin_id","name");
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "pg_constraint"
    WHERE "conname" = 'leave_type_config_admin_code_unique'
  ) THEN
    ALTER TABLE "leave_type_config"
      ADD CONSTRAINT "leave_type_config_admin_code_unique"
      UNIQUE("admin_id","code");
  END IF;
END $$;
