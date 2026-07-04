-- AWS FaceIds cannot be converted to OpenCV embeddings. Employees with an old
-- registration must register again after this provider migration.
DELETE FROM "employee_face_biometric";--> statement-breakpoint
ALTER TABLE "employee_face_biometric" DROP CONSTRAINT "employee_face_biometric_provider_face_id_unique";--> statement-breakpoint
ALTER TABLE "employee_face_biometric" ALTER COLUMN "provider" SET DEFAULT 'opencv_sface';--> statement-breakpoint
ALTER TABLE "employee_face_biometric" ADD COLUMN "embedding" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_face_biometric" DROP COLUMN "provider_face_id";
