ALTER TABLE "offer_letter" ADD COLUMN IF NOT EXISTS "accept_token" varchar(128);
CREATE UNIQUE INDEX IF NOT EXISTS "offer_letter_accept_token_unique" ON "offer_letter" ("accept_token");
