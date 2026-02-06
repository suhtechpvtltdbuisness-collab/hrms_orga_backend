CREATE TABLE "employee" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_emp_id_unique";--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "emp_id" SET DATA TYPE integer USING emp_id::integer;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "marked_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leave" ALTER COLUMN "emp_id" SET DATA TYPE integer USING emp_id::integer;--> statement-breakpoint
ALTER TABLE "log_activity" ALTER COLUMN "emp_id" SET DATA TYPE integer USING emp_id::integer;--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "emp_id" SET DATA TYPE integer USING emp_id::integer;--> statement-breakpoint
ALTER TABLE "training_and_development" ALTER COLUMN "emp_id" SET DATA TYPE integer USING emp_id::integer;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave" ADD CONSTRAINT "leave_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_activity" ADD CONSTRAINT "log_activity_emp_id_users_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_and_development" ADD CONSTRAINT "training_and_development_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "emp_id";