CREATE TABLE "shift_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_time" varchar(20) NOT NULL,
	"end_time" varchar(20) NOT NULL,
	"holiday_list" varchar(50),
	"enable_auto_attendance" boolean DEFAULT false NOT NULL,
	"determine_checkin_checkout" varchar(255),
	"working_hours_calculation" varchar(255),
	"begin_checkin_before" integer,
	"allow_checkout_after" integer,
	"working_hours_threshold_half_day" varchar(20),
	"working_hours_threshold_absent" varchar(20),
	"process_attendance_after" varchar(50),
	"last_sync_of_checkin" varchar(50),
	"enable_entry_grace_period" boolean DEFAULT false NOT NULL,
	"late_entry_grace_period" integer,
	"enable_exit_grace_period" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shift_type" ADD CONSTRAINT "shift_type_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;