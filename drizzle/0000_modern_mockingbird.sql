CREATE TYPE "public"."designation_type" AS ENUM('permanent', 'temporary', 'contract');--> statement-breakpoint
CREATE TYPE "public"."employee_type" AS ENUM('full_time', 'part_time', 'intern');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('sick', 'casual', 'earned', 'maternity', 'paternity');--> statement-breakpoint
CREATE TYPE "public"."module" AS ENUM('hrms', 'payroll', 'attendance', 'leave');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('startup', 'enterprise', 'sme');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'bank_transfer', 'cheque', 'online');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free_trial', 'basic', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('admin', 'employee', 'manager');--> statement-breakpoint
CREATE TABLE "employee" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "plain" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"price" double precision NOT NULL,
	"type" "organization_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"module" "module" NOT NULL,
	"expired" varchar(50),
	"purchase_date" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plain_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"plain_id" integer NOT NULL,
	"status" varchar(50),
	"transaction_id" varchar(255),
	"payment_mode" "payment_mode" NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"payment_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"marked_by" integer NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"head" varchar(255),
	"location" varchar(255),
	"description" text,
	"parent_id" integer,
	"admin_id" integer NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designation" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "designation_type" NOT NULL,
	"department_id" integer,
	"level" integer NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"responsibility" text,
	"reporting_to" integer,
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"type" varchar(100),
	"url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employment" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"job_title" varchar(255),
	"sub_department" varchar(255),
	"reporting_manager" integer,
	"date_of_joining" varchar(50),
	"work_location" varchar(255),
	"branch" varchar(255),
	"prohibition_period" varchar(100),
	"confirm_date" varchar(50),
	"emp_status" boolean DEFAULT true,
	"prohibition_end" varchar(50),
	"contract_type" varchar(100),
	"contract_start" varchar(50),
	"contract_end" varchar(50),
	"contract_pay" varchar(100),
	"contract_duration" varchar(100),
	"renewal_status" boolean DEFAULT false,
	"work_mode" varchar(100),
	"current_shift" integer,
	"shift_timing" varchar(255),
	"assigned_template" varchar(255),
	"weekly_pattern" varchar(255),
	"overtime" varchar(255),
	"assigned_shift" varchar(255),
	"shift_start_time" varchar(50),
	"shift_end_time" varchar(50),
	"weekly_off" varchar(255),
	"break_timing" varchar(255),
	"weekly_schedule" varchar(255),
	"working_hours" integer,
	"total_weekly_hours" integer,
	"custom_scheduled" boolean DEFAULT false,
	"flexible_hours" integer,
	"monthly_roster_calendar" varchar(255),
	"rotation_shift_cycle" varchar(255),
	"upcoming_shift_cycle" varchar(255),
	"attendance_linked" boolean DEFAULT false,
	"swap_request" varchar(255),
	"primary_roles" varchar(255),
	"additional_roles" varchar(255),
	"module_access" varchar(255),
	"role_effective_from" varchar(50),
	"level" integer,
	"access_scope" varchar(255),
	"approval_right" boolean DEFAULT false,
	"special_permission" varchar(255),
	"data_visibility" varchar(255),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_application_id" integer NOT NULL,
	"interviewer_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"instruction" text,
	"meeting_link" varchar(255),
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_application" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"applicant_name" varchar(255) NOT NULL,
	"applicant_email" varchar(255) NOT NULL,
	"resume" text,
	"cover_letter" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"admin_id" integer NOT NULL,
	"employee_type" "employee_type" NOT NULL,
	"description" text,
	"required_skills" text,
	"location" varchar(255),
	"salary_range" varchar(100),
	"department_id" integer,
	"designation_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave" (
	"id" serial PRIMARY KEY NOT NULL,
	"total" integer NOT NULL,
	"sick_leave" integer DEFAULT 0 NOT NULL,
	"casual_leave" integer DEFAULT 0 NOT NULL,
	"paid_leave" integer DEFAULT 0 NOT NULL,
	"sick_leave_taken" integer DEFAULT 0 NOT NULL,
	"casual_leave_taken" integer DEFAULT 0 NOT NULL,
	"paid_leave_taken" integer DEFAULT 0 NOT NULL,
	"taken" integer DEFAULT 0 NOT NULL,
	"emp_id" integer NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(100),
	"description" text,
	"emp_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"joining_date" varchar(50),
	"department_id" integer,
	"manager_id" integer,
	"phone" varchar(50),
	"location" varchar(255),
	"exit_date" varchar(50),
	"type" varchar(100),
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll" (
	"id" serial PRIMARY KEY NOT NULL,
	"structure" text,
	"ctc" numeric(15, 2) NOT NULL,
	"monthly_gross" numeric(15, 2) NOT NULL,
	"monthly_pay" numeric(15, 2) NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"department_id" integer,
	"base_salary" numeric(15, 2),
	"hra" numeric(15, 2),
	"conveyance_pay" numeric(15, 2),
	"overtime_pay" numeric(15, 2),
	"special_pay" numeric(15, 2),
	"emp_id" integer NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"date" varchar(50),
	"rating" integer,
	"status" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_and_development" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"type" varchar(100),
	"videos" text,
	"docs" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"gender" varchar(20),
	"dob" varchar(50),
	"blood_group" varchar(10),
	"password" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"marital_status" boolean NOT NULL,
	"type" "user_type" NOT NULL,
	"e_contact_name" varchar(255),
	"e_contact_number" varchar(50),
	"e_relation" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"active" boolean DEFAULT true NOT NULL,
	"address" text,
	"aadhar_no" varchar(50),
	"pancard_no" varchar(50),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plain" ADD CONSTRAINT "plain_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plain_payment" ADD CONSTRAINT "plain_payment_plain_id_plain_id_fk" FOREIGN KEY ("plain_id") REFERENCES "public"."plain"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designation" ADD CONSTRAINT "designation_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designation" ADD CONSTRAINT "designation_reporting_to_users_id_fk" FOREIGN KEY ("reporting_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment" ADD CONSTRAINT "employment_employee_id_employee_user_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment" ADD CONSTRAINT "employment_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment" ADD CONSTRAINT "employment_reporting_manager_users_id_fk" FOREIGN KEY ("reporting_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_job_application_id_job_application_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_designation_id_designation_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave" ADD CONSTRAINT "leave_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_activity" ADD CONSTRAINT "log_activity_emp_id_users_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_manager_id_employee_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance" ADD CONSTRAINT "performance_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_and_development" ADD CONSTRAINT "training_and_development_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;