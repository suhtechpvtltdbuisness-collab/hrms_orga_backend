import { sql, type SQLWrapper } from "drizzle-orm";

/** Keeps employee-owned records reversible by using users.is_deleted as the archive switch. */
export function employeeIsVisible(employeeId: SQLWrapper) {
  return sql<boolean>`EXISTS (
    SELECT 1
    FROM "users" AS "visible_employee"
    WHERE "visible_employee"."id" = ${employeeId}
      AND "visible_employee"."is_deleted" = false
  )`;
}
