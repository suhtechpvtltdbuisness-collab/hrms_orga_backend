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
ALTER TABLE "document" ALTER COLUMN "emp_id" SET DATA TYPE integer USING emp_id::integer;--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "type" varchar(100);--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "leave" ADD COLUMN "sick_leave" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave" ADD COLUMN "casual_leave" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave" ADD COLUMN "paid_leave" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave" ADD COLUMN "sick_leave_taken" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave" ADD COLUMN "casual_leave_taken" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leave" ADD COLUMN "paid_leave_taken" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offboarding" ADD CONSTRAINT "offboarding_manager_id_employee_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance" ADD CONSTRAINT "performance_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_emp_id_employee_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN "aadhar";--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN "pancard";--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN "offer_letter";