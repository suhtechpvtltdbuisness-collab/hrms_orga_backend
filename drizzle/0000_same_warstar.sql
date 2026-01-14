CREATE TYPE "public"."designation_type" AS ENUM('permanent', 'temporary', 'contract');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('sick', 'casual', 'earned', 'maternity', 'paternity');--> statement-breakpoint
CREATE TYPE "public"."module" AS ENUM('hrms', 'payroll', 'attendance', 'leave');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('startup', 'enterprise', 'sme');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'bank_transfer', 'cheque', 'online');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('admin', 'employee', 'manager');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" varchar(100) NOT NULL,
	"marked_by" integer,
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
	"parent_id" varchar(50),
	"status" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designation" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "designation_type" NOT NULL,
	"department_id" integer,
	"level" integer NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"responsibility" text,
	"reporting_to" varchar(100),
	"description" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" varchar(100) NOT NULL,
	"aadhar" text,
	"pancard" text,
	"offer_letter" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "leave_type" NOT NULL,
	"total" integer NOT NULL,
	"taken" integer DEFAULT 0 NOT NULL,
	"emp_id" varchar(100) NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(100),
	"description" text,
	"emp_id" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"plan" varchar(100),
	"payment_method" varchar(100),
	"payment_mode" "payment_mode" NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"offer" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_order_id" integer,
	"status" varchar(50),
	"total_amount" numeric(15, 2) NOT NULL,
	"payment_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
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
	"emp_id" varchar(100) NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_and_development" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" varchar(100) NOT NULL,
	"type" varchar(100),
	"videos" text,
	"docs" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"gender" varchar(20),
	"dob" varchar(50),
	"blood_group" varchar(10),
	"password" text NOT NULL,
	"marital_status" varchar(50),
	"type" "user_type" NOT NULL,
	"e_contact_name" varchar(255),
	"e_contact_number" integer,
	"e_relation" varchar(100),
	"email" varchar(255) NOT NULL,
	"phone" integer,
	"active" boolean DEFAULT true NOT NULL,
	"address" text,
	"aadhar_no" integer,
	"pancard_no" integer,
	"organization_id" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_emp_id_unique" UNIQUE("emp_id")
);
--> statement-breakpoint
ALTER TABLE "designation" ADD CONSTRAINT "designation_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_order" ADD CONSTRAINT "org_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;