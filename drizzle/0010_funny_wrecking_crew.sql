CREATE TYPE "public"."employee_type" AS ENUM('full_time', 'part_time', 'intern');--> statement-breakpoint
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
ALTER TABLE "employment" ADD CONSTRAINT "employment_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment" ADD CONSTRAINT "employment_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employment" ADD CONSTRAINT "employment_reporting_manager_users_id_fk" FOREIGN KEY ("reporting_manager") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_job_application_id_job_application_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_designation_id_designation_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designation"("id") ON DELETE no action ON UPDATE no action;