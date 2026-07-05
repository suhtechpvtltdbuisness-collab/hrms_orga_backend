ALTER TABLE "attendance"
ADD COLUMN "check_out_verification_method" varchar(30);--> statement-breakpoint
ALTER TABLE "attendance"
ADD COLUMN "check_out_face_image" text;
