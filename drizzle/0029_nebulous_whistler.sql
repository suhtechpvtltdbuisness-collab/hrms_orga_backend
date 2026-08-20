CREATE TYPE "public"."attendance_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."identity_status" AS ENUM('anonymous', 'company_identified', 'person_identified', 'authenticated');--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"type" varchar(100) DEFAULT 'Company Update' NOT NULL,
	"priority" varchar(50) DEFAULT 'Normal' NOT NULL,
	"audience" varchar(100) DEFAULT 'All Employees' NOT NULL,
	"departments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"employees" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"expiry_date" varchar(50),
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_read" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_read_announcement_id_user_id_unique" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "appraisal" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"series" varchar(100) DEFAULT 'HR-APR' NOT NULL,
	"template_id" integer,
	"emp_id" integer NOT NULL,
	"department_id" integer,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"start_date" varchar(50),
	"end_date" varchar(50),
	"remarks" text,
	"total_score" numeric(10, 3) DEFAULT '0' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_goal" (
	"id" serial PRIMARY KEY NOT NULL,
	"appraisal_id" integer NOT NULL,
	"template_goal_id" integer,
	"sr_no" varchar(20),
	"goal" varchar(255) NOT NULL,
	"weightage" numeric(10, 2) DEFAULT '0' NOT NULL,
	"score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"earned" numeric(10, 3) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_template_goal" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"sr_no" varchar(20),
	"kra" varchar(255) NOT NULL,
	"weightage" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"request_type" varchar(120) NOT NULL,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"explanation" text NOT NULL,
	"status" "attendance_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_cash_account" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"linked_gl_account_id" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"fiscal_year_id" integer,
	"period_start" varchar(50) NOT NULL,
	"period_end" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'Draft' NOT NULL,
	"notes" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"budget_id" integer NOT NULL,
	"department_id" integer,
	"account_id" integer,
	"category_name" varchar(255) NOT NULL,
	"budgeted_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_account" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"parent_account" varchar(255),
	"currency" varchar(20),
	"opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"statement_section" varchar(40),
	"cash_flow_activity" varchar(20),
	"report_category" varchar(120),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_point_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"emp_id" integer NOT NULL,
	"rule_id" integer,
	"status" varchar(50) DEFAULT 'Auto' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"reference_document_type" varchar(255),
	"reference_document_id" varchar(255),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_point_review_level" (
	"id" serial PRIMARY KEY NOT NULL,
	"settings_id" integer NOT NULL,
	"level_name" varchar(100) NOT NULL,
	"role" varchar(255) NOT NULL,
	"review_points" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_point_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"reference_document_type" varchar(255),
	"for_document_event" varchar(50) DEFAULT 'Custom' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"allot_points_to_user" boolean DEFAULT false NOT NULL,
	"user_field" varchar(100) DEFAULT 'Owner',
	"multiplier_field" varchar(255),
	"apply_only_once" boolean DEFAULT false NOT NULL,
	"condition" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_point_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"allocation_period" varchar(100) DEFAULT 'Weekly',
	"last_allocation_date" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "energy_point_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(255) NOT NULL,
	"category_id" integer,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expense_date" varchar(50) NOT NULL,
	"payment_type" varchar(100),
	"bill" text,
	"status" varchar(50) DEFAULT 'Submitted' NOT NULL,
	"employee_name" varchar(255),
	"cost_center" varchar(120),
	"department_id" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"linked_account" varchar(255),
	"monthly_budget" numeric(14, 2),
	"daily_limit" numeric(14, 2),
	"approval" varchar(50) DEFAULT 'Not Required' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_year" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"start_date" varchar(50) NOT NULL,
	"end_date" varchar(50) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_calendar_connection" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"google_email" varchar(255),
	"refresh_token" text NOT NULL,
	"access_token" text,
	"token_expiry" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "google_calendar_connection_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"sales_invoice_id" integer,
	"invoice_number" varchar(100),
	"customer" varchar(255) NOT NULL,
	"payment_date" varchar(50) NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"method" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"entry_date" varchar(50) NOT NULL,
	"remarks" text NOT NULL,
	"total_debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(15, 2) DEFAULT '0' NOT NULL,
	"department_id" integer,
	"cost_center" varchar(120),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_letter" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_application_id" integer NOT NULL,
	"interview_id" integer,
	"admin_id" integer NOT NULL,
	"candidate_name" varchar(255) NOT NULL,
	"candidate_email" varchar(255) NOT NULL,
	"job_title" varchar(255),
	"salary" varchar(100),
	"joining_date" date,
	"department" varchar(255),
	"designation" varchar(255),
	"notes" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"accept_token" varchar(128),
	"onboarding_status" varchar(50) DEFAULT 'not_started' NOT NULL,
	"onboarding_started_at" timestamp,
	"onboarding_completed_at" timestamp,
	"onboarding_tasks" text,
	"employee_user_id" integer,
	"viewed_at" timestamp,
	"sent_at" timestamp,
	"accepted_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "offer_letter_accept_token_unique" UNIQUE("accept_token")
);
--> statement-breakpoint
CREATE TABLE "purchase_invoice" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"supplier_name" varchar(255) NOT NULL,
	"bill_date" varchar(50) NOT NULL,
	"due_date" varchar(50),
	"sub_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_invoice_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(8, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_invoice" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"invoice_title" varchar(255) NOT NULL,
	"client" varchar(255) NOT NULL,
	"client_id" integer,
	"invoice_type" varchar(50),
	"bill_date" varchar(50) NOT NULL,
	"revenue_account" varchar(255),
	"tax_rules" varchar(50),
	"sub_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_invoice_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"phase" varchar(255) NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"schedule_date" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"record_id" integer,
	"description" varchar(500) NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_document" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"opportunity_id" integer,
	"title" varchar(255) NOT NULL,
	"client_name" varchar(255),
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"owner" varchar(255),
	"amount" numeric(14, 2),
	"notes" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"client_id" integer,
	"invoice_date" varchar(50) NOT NULL,
	"due_date" varchar(50),
	"sub_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_tax" numeric(14, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(50) DEFAULT 'Pending' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rate" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(8, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) DEFAULT 'Services' NOT NULL,
	"owner" varchar(255),
	"content" text,
	"views" integer DEFAULT 0 NOT NULL,
	"confidence" integer DEFAULT 90 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_product" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) DEFAULT 'Subscription' NOT NULL,
	"status" varchar(20) DEFAULT 'Active' NOT NULL,
	"team" varchar(100),
	"price_label" varchar(100),
	"note" varchar(255),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"record_type" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"company" varchar(255),
	"status" varchar(50) DEFAULT 'New' NOT NULL,
	"owner" varchar(255),
	"value" numeric(14, 2) DEFAULT '0' NOT NULL,
	"health" integer DEFAULT 50 NOT NULL,
	"source" varchar(100),
	"next_action" varchar(255),
	"follow_up_at" timestamp,
	"notes" text,
	"metadata" jsonb,
	"conversion_status" varchar(30),
	"converted_at" timestamp,
	"close_lost_at" timestamp,
	"won_at" timestamp,
	"activated_at" timestamp,
	"churned_at" timestamp,
	"source_lead_id" integer,
	"source_opportunity_id" integer,
	"linked_opportunity_id" integer,
	"loss_reason" varchar(100),
	"ai_lead_score" integer,
	"is_read_only" boolean DEFAULT false NOT NULL,
	"client_lifecycle" varchar(30),
	"renewal_status" varchar(30),
	"client_source" varchar(20),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" varchar(128) NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"event_name" varchar(128) NOT NULL,
	"page_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" varchar(128) NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"landing_page" text,
	"exit_page" text,
	"referrer" text,
	"duration_seconds" integer,
	"device" varchar(64),
	"browser" varchar(64),
	"os" varchar(64),
	CONSTRAINT "visitor_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"visitor_id" varchar(128) NOT NULL,
	"known_user_id" integer,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"first_page" text,
	"last_page" text,
	"first_referrer" text,
	"last_referrer" text,
	"utm_source" varchar(256),
	"utm_medium" varchar(256),
	"utm_campaign" varchar(256),
	"utm_term" varchar(256),
	"utm_content" varchar(256),
	"ip_address" varchar(64),
	"country" varchar(128),
	"region" varchar(128),
	"city" varchar(128),
	"company_name" varchar(256),
	"company_domain" varchar(256),
	"person_name" varchar(256),
	"work_email" varchar(256),
	"phone" varchar(64),
	"job_title" varchar(256),
	"linkedin_url" text,
	"identity_status" "identity_status" DEFAULT 'anonymous' NOT NULL,
	"identity_provider" varchar(64),
	"match_confidence" double precision,
	"lead_score" integer DEFAULT 0 NOT NULL,
	"page_view_count" integer DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "visitors_visitor_id_unique" UNIQUE("visitor_id")
);
--> statement-breakpoint
ALTER TABLE "interview" ALTER COLUMN "meeting_link" SET DATA TYPE varchar(512);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_verification_method" varchar(30);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_in_face_image" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_out_verification_method" varchar(30);--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "check_out_face_image" text;--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "google_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "meeting_code" varchar(64);--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "interview_type" varchar(100);--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "interview_mode" varchar(50);--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "panel" varchar(50);--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "scheduled_by" integer;--> statement-breakpoint
ALTER TABLE "interview" ADD COLUMN "idempotency_key" varchar(128);--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "document_upload_token" varchar(128);--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "candidate_documents" text;--> statement-breakpoint
ALTER TABLE "job_application" ADD COLUMN "candidate_profile" text;--> statement-breakpoint
ALTER TABLE "subscription_plan_definition" ADD COLUMN "price_usd" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plan_definition" ADD COLUMN "price_per_employee_usd" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal" ADD CONSTRAINT "appraisal_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal" ADD CONSTRAINT "appraisal_template_id_appraisal_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."appraisal_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal" ADD CONSTRAINT "appraisal_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal" ADD CONSTRAINT "appraisal_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal" ADD CONSTRAINT "appraisal_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_goal" ADD CONSTRAINT "appraisal_goal_appraisal_id_appraisal_id_fk" FOREIGN KEY ("appraisal_id") REFERENCES "public"."appraisal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_goal" ADD CONSTRAINT "appraisal_goal_template_goal_id_appraisal_template_goal_id_fk" FOREIGN KEY ("template_goal_id") REFERENCES "public"."appraisal_template_goal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_template" ADD CONSTRAINT "appraisal_template_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_template" ADD CONSTRAINT "appraisal_template_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_template_goal" ADD CONSTRAINT "appraisal_template_goal_template_id_appraisal_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."appraisal_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_request" ADD CONSTRAINT "attendance_request_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_request" ADD CONSTRAINT "attendance_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_cash_account" ADD CONSTRAINT "bank_cash_account_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_cash_account" ADD CONSTRAINT "bank_cash_account_linked_gl_account_id_chart_account_id_fk" FOREIGN KEY ("linked_gl_account_id") REFERENCES "public"."chart_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_cash_account" ADD CONSTRAINT "bank_cash_account_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_fiscal_year_id_fiscal_year_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_year"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_line" ADD CONSTRAINT "budget_line_budget_id_budget_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_line" ADD CONSTRAINT "budget_line_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_line" ADD CONSTRAINT "budget_line_account_id_chart_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_account" ADD CONSTRAINT "chart_account_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_account" ADD CONSTRAINT "chart_account_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_log" ADD CONSTRAINT "energy_point_log_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_log" ADD CONSTRAINT "energy_point_log_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_log" ADD CONSTRAINT "energy_point_log_rule_id_energy_point_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."energy_point_rule"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_log" ADD CONSTRAINT "energy_point_log_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_review_level" ADD CONSTRAINT "energy_point_review_level_settings_id_energy_point_settings_id_fk" FOREIGN KEY ("settings_id") REFERENCES "public"."energy_point_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_rule" ADD CONSTRAINT "energy_point_rule_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_rule" ADD CONSTRAINT "energy_point_rule_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_point_settings" ADD CONSTRAINT "energy_point_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_category_id_expense_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_year" ADD CONSTRAINT "fiscal_year_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_year" ADD CONSTRAINT "fiscal_year_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_sales_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_payment" ADD CONSTRAINT "invoice_payment_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_journal_entry_id_journal_entry_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_account_id_chart_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."chart_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_job_application_id_job_application_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_application"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_interview_id_interview_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interview"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_employee_user_id_users_id_fk" FOREIGN KEY ("employee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice" ADD CONSTRAINT "purchase_invoice_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice" ADD CONSTRAINT "purchase_invoice_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_invoice_item" ADD CONSTRAINT "purchase_invoice_item_invoice_id_purchase_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."purchase_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoice" ADD CONSTRAINT "recurring_invoice_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoice" ADD CONSTRAINT "recurring_invoice_client_id_sales_record_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."sales_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoice" ADD CONSTRAINT "recurring_invoice_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_invoice_item" ADD CONSTRAINT "recurring_invoice_item_invoice_id_recurring_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."recurring_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_activity" ADD CONSTRAINT "sales_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_activity" ADD CONSTRAINT "sales_activity_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_document" ADD CONSTRAINT "sales_document_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_document" ADD CONSTRAINT "sales_document_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_client_id_sales_record_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."sales_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice" ADD CONSTRAINT "sales_invoice_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_item" ADD CONSTRAINT "sales_invoice_item_invoice_id_sales_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_knowledge" ADD CONSTRAINT "sales_knowledge_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_knowledge" ADD CONSTRAINT "sales_knowledge_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_product" ADD CONSTRAINT "sales_product_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_product" ADD CONSTRAINT "sales_product_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_record" ADD CONSTRAINT "sales_record_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_record" ADD CONSTRAINT "sales_record_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_visitor_id_visitors_visitor_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("visitor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_known_user_id_users_id_fk" FOREIGN KEY ("known_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_scheduled_by_users_id_fk" FOREIGN KEY ("scheduled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_idempotency_key_unique" UNIQUE("idempotency_key");--> statement-breakpoint
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_document_upload_token_unique" UNIQUE("document_upload_token");