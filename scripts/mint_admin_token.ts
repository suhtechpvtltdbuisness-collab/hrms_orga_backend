import dotenv from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db/connection.js";
import { users } from "../src/db/schema.js";
import { generateAccessToken } from "../src/utils/jwt.js";

dotenv.config();

const wantEmployee = process.argv.includes("--employee");

const [user] = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isDeleted, false),
      eq(users.active, true),
      wantEmployee ? inArray(users.roleId, [2]) : inArray(users.roleId, [0, 1]),
    ),
  )
  .limit(1);

if (!user) {
  console.error("No matching user found");
  process.exit(1);
}

console.log(
  generateAccessToken({
    userId: user.id,
    email: user.email,
    type: user.type,
    roleId: user.roleId,
  }),
);
await pool.end();
