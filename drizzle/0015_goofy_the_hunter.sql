CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"referral_code" varchar(50) NOT NULL,
	"job_id" integer,
	"candidate_name" varchar(255),
	"candidate_email" varchar(255),
	"candidate_phone" varchar(50),
	"resume_url" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "department" DROP CONSTRAINT "department_admin_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "department" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "department" ALTER COLUMN "status" SET DEFAULT 'Active';--> statement-breakpoint
ALTER TABLE "job_application" ALTER COLUMN "applicant_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "employee_type" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "department_name" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "department_code" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "manager_id" integer;--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "employee_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "applicant_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "applicant_experience" varchar(100);--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "applicant_skills" text;--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "hr_notes" text;--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "ats_data" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "number_of_openings" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "experience" varchar(50);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_summary" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "key_responsibilities" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "application_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "application_source" varchar(100) DEFAULT 'Company Website';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_visibility" varchar(50) DEFAULT 'Public';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "jd_file_url" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_manager_id_employee_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "department" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "department" DROP COLUMN "head";--> statement-breakpoint
ALTER TABLE "department" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "department" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "department" DROP COLUMN "admin_id";--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_department_name_unique" UNIQUE("organization_id","department_name");--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_department_code_unique" UNIQUE("organization_id","department_code");