import { db } from "../db/connection.js";
import { googleCalendarConnection } from "../db/schema.js";
import { eq } from "drizzle-orm";

class GoogleCalendarRepository {
  async getByUserId(userId: number) {
    const [row] = await db
      .select()
      .from(googleCalendarConnection)
      .where(eq(googleCalendarConnection.userId, userId))
      .limit(1);
    return row;
  }

  async upsertConnection(data: {
    userId: number;
    googleEmail?: string | null;
    refreshToken: string;
    accessToken?: string | null;
    tokenExpiry?: Date | null;
  }) {
    const existing = await this.getByUserId(data.userId);
    if (existing) {
      const [updated] = await db
        .update(googleCalendarConnection)
        .set({
          googleEmail: data.googleEmail ?? existing.googleEmail,
          refreshToken: data.refreshToken,
          accessToken: data.accessToken ?? existing.accessToken,
          tokenExpiry: data.tokenExpiry ?? existing.tokenExpiry,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarConnection.userId, data.userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(googleCalendarConnection)
      .values({
        userId: data.userId,
        googleEmail: data.googleEmail ?? null,
        refreshToken: data.refreshToken,
        accessToken: data.accessToken ?? null,
        tokenExpiry: data.tokenExpiry ?? null,
      })
      .returning();
    return created;
  }

  async updateTokens(
    userId: number,
    tokens: { accessToken?: string | null; tokenExpiry?: Date | null },
  ) {
    const [updated] = await db
      .update(googleCalendarConnection)
      .set({
        accessToken: tokens.accessToken,
        tokenExpiry: tokens.tokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnection.userId, userId))
      .returning();
    return updated;
  }

  async deleteByUserId(userId: number) {
    const [deleted] = await db
      .delete(googleCalendarConnection)
      .where(eq(googleCalendarConnection.userId, userId))
      .returning();
    return deleted;
  }
}

export default GoogleCalendarRepository;
