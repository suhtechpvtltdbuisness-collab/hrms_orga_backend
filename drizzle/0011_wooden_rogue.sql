CREATE TYPE "public"."payroll_accounting_status" AS ENUM('pending', 'stubbed', 'posted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payroll_entry_status" AS ENUM('calculated', 'finalized', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."salary_component_amount_type" AS ENUM('fixed', 'formula');--> statement-breakpoint
CREATE TYPE "public"."salary_component_type" AS ENUM('earning', 'deduction');--> statement-breakpoint
CREATE TYPE "public"."salary_slip_status" AS ENUM('draft', 'finalized', 'signed_off');--> statement-breakpoint
CREATE TABLE "additional_salary" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"salary_component_id" integer,
	"component_name" varchar(255) NOT NULL,
	"type" "salary_component_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"payroll_period_start" date NOT NULL,
	"payroll_period_end" date NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL,
	"reason" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_accounting" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_entry_id" integer NOT NULL,
	"status" "payroll_accounting_status" DEFAULT 'stubbed' NOT NULL,
	"journal_entry_id" integer,
	"payload" jsonb NOT NULL,
	"message" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"salary_structure_id" integer,
	"salary_structure_assignment_id" integer,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_working_days" integer NOT NULL,
	"paid_days" integer NOT NULL,
	"gross_pay" numeric(15, 2) NOT NULL,
	"taxable_earnings" numeric(15, 2) NOT NULL,
	"total_deductions" numeric(15, 2) NOT NULL,
	"net_pay" numeric(15, 2) NOT NULL,
	"earnings" jsonb NOT NULL,
	"deductions" jsonb NOT NULL,
	"additional_salaries" jsonb NOT NULL,
	"statutory_deductions" jsonb NOT NULL,
	"status" "payroll_entry_status" DEFAULT 'calculated' NOT NULL,
	"accounting_status" "payroll_accounting_status" DEFAULT 'pending' NOT NULL,
	"accounting_message" text,
	"finalized_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_entry_emp_id_period_start_period_end_unique" UNIQUE("emp_id","period_start","period_end")
);
--> statement-breakpoint
CREATE TABLE "salary_component" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"type" "salary_component_type" NOT NULL,
	"amount_type" "salary_component_amount_type" DEFAULT 'fixed' NOT NULL,
	"amount" numeric(15, 2),
	"formula" text,
	"taxable" boolean DEFAULT true NOT NULL,
	"depends_on_payment_days" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"description" text,
	"default_account" varchar(255),
	"cost_center" varchar(255),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "salary_component_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "salary_slip" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_entry_id" integer NOT NULL,
	"slip_number" varchar(100) NOT NULL,
	"employee_snapshot" jsonb NOT NULL,
	"earnings" jsonb NOT NULL,
	"deductions" jsonb NOT NULL,
	"gross_pay" numeric(15, 2) NOT NULL,
	"total_deductions" numeric(15, 2) NOT NULL,
	"net_pay" numeric(15, 2) NOT NULL,
	"status" "salary_slip_status" DEFAULT 'draft' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"finalized_at" timestamp,
	"signed_off_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "salary_slip_payroll_entry_id_unique" UNIQUE("payroll_entry_id"),
	CONSTRAINT "salary_slip_slip_number_unique" UNIQUE("slip_number")
);
--> statement-breakpoint
CREATE TABLE "salary_structure" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structure_assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"base_salary" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_structure_component" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_structure_id" integer NOT NULL,
	"salary_component_id" integer NOT NULL,
	"amount" numeric(15, 2),
	"formula" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "additional_salary" ADD CONSTRAINT "additional_salary_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_salary" ADD CONSTRAINT "additional_salary_salary_component_id_salary_component_id_fk" FOREIGN KEY ("salary_component_id") REFERENCES "public"."salary_component"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_salary" ADD CONSTRAINT "additional_salary_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_accounting" ADD CONSTRAINT "payroll_accounting_payroll_entry_id_payroll_entry_id_fk" FOREIGN KEY ("payroll_entry_id") REFERENCES "public"."payroll_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_accounting" ADD CONSTRAINT "payroll_accounting_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry" ADD CONSTRAINT "payroll_entry_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry" ADD CONSTRAINT "payroll_entry_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry" ADD CONSTRAINT "payroll_entry_salary_structure_assignment_id_salary_structure_assignment_id_fk" FOREIGN KEY ("salary_structure_assignment_id") REFERENCES "public"."salary_structure_assignment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_entry" ADD CONSTRAINT "payroll_entry_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_component" ADD CONSTRAINT "salary_component_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_payroll_entry_id_payroll_entry_id_fk" FOREIGN KEY ("payroll_entry_id") REFERENCES "public"."payroll_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_slip" ADD CONSTRAINT "salary_slip_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure" ADD CONSTRAINT "salary_structure_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_assignment" ADD CONSTRAINT "salary_structure_assignment_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_assignment" ADD CONSTRAINT "salary_structure_assignment_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_assignment" ADD CONSTRAINT "salary_structure_assignment_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_component" ADD CONSTRAINT "salary_structure_component_salary_structure_id_salary_structure_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structure"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_structure_component" ADD CONSTRAINT "salary_structure_component_salary_component_id_salary_component_id_fk" FOREIGN KEY ("salary_component_id") REFERENCES "public"."salary_component"("id") ON DELETE no action ON UPDATE no action;