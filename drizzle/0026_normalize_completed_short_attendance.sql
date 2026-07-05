UPDATE "attendance"
SET "status" = 'present',
    "updated_at" = NOW()
WHERE "check_in" IS NOT NULL
  AND "check_out" IS NOT NULL
  AND "status" = 'absent'
  AND "period" = 'less_than_half_day';
