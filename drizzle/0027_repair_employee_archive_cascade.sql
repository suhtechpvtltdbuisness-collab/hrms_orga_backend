-- Employee archival is controlled by users.is_deleted. Restore child rows that
-- were archived at the same time by the previous cascading implementation.
UPDATE "employment" AS "employment_record"
SET "is_deleted" = false,
    "updated_at" = NOW()
FROM "users" AS "employee_user"
WHERE "employment_record"."employee_id" = "employee_user"."id"
  AND "employee_user"."is_deleted" = true
  AND "employment_record"."is_deleted" = true
  AND "employment_record"."updated_at" BETWEEN
      "employee_user"."updated_at" - INTERVAL '10 seconds'
      AND "employee_user"."updated_at" + INTERVAL '10 seconds';--> statement-breakpoint

UPDATE "payroll" AS "payroll_record"
SET "is_deleted" = false,
    "updated_at" = NOW()
FROM "users" AS "employee_user"
WHERE "payroll_record"."emp_id" = "employee_user"."id"
  AND "employee_user"."is_deleted" = true
  AND "payroll_record"."is_deleted" = true
  AND "payroll_record"."updated_at" BETWEEN
      "employee_user"."updated_at" - INTERVAL '10 seconds'
      AND "employee_user"."updated_at" + INTERVAL '10 seconds';
