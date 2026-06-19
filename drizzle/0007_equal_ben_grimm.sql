CREATE TABLE "leave_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"emp_id" integer NOT NULL,
	"leave_type" "leave_type" NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"days" integer NOT NULL,
	"reason" text,
	"status" "shift_request_status" DEFAULT 'submitted' NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_emp_id_employee_user_id_fk" FOREIGN KEY ("emp_id") REFERENCES "public"."employee"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;