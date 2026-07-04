CREATE TABLE "employee_face_biometric" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"provider_face_id" varchar(255) NOT NULL,
	"provider" varchar(40) DEFAULT 'aws_rekognition' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_face_biometric_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employee_face_biometric_provider_face_id_unique" UNIQUE("provider_face_id")
);
--> statement-breakpoint
ALTER TABLE "employee_face_biometric" ADD CONSTRAINT "employee_face_biometric_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
