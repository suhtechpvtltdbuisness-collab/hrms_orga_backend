CREATE UNIQUE INDEX IF NOT EXISTS "plain_payment_payment_id_unique"
ON "plain_payment" ("payment_id")
WHERE "payment_id" IS NOT NULL;
