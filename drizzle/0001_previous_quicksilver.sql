CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'half_day', 'on_leave');--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "attendance_date" date;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "status" "attendance_status";--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "leave_type" "leave_type";--> statement-breakpoint
UPDATE "attendance" SET "attendance_date" = "created_at"::date WHERE "attendance_date" IS NULL;--> statement-breakpoint
UPDATE "attendance" SET "status" = 'present' WHERE "status" IS NULL;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "attendance_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_emp_id_attendance_date_unique" UNIQUE("emp_id","attendance_date");
