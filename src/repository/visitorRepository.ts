import { db } from "../db/connection.js";
import { visitors, visitorSessions, visitorEvents } from "../db/schema.js";
import { eq, desc, count, and, gte, isNotNull, isNull, sql } from "drizzle-orm";

export type UpsertVisitorInput = {
  visitorId: string;
  firstPage?: string;
  lastPage?: string;
  firstReferrer?: string;
  lastReferrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  ipAddress?: string;
  country?: string;
  region?: string;
  city?: string;
};

export async function upsertVisitor(input: UpsertVisitorInput) {
  const existing = await db
    .select()
    .from(visitors)
    .where(eq(visitors.visitorId, input.visitorId))
    .limit(1);

  if (existing.length === 0) {
    const [created] = await db
      .insert(visitors)
      .values({
        visitorId: input.visitorId,
        firstPage: input.firstPage,
        lastPage: input.lastPage,
        firstReferrer: input.firstReferrer,
        lastReferrer: input.lastReferrer,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmTerm: input.utmTerm,
        utmContent: input.utmContent,
        ipAddress: input.ipAddress,
        country: input.country,
        region: input.region,
        city: input.city,
      })
      .returning();
    return created;
  }

  const [updated] = await db
    .update(visitors)
    .set({
      lastSeenAt: new Date(),
      lastPage: input.lastPage ?? existing[0].lastPage,
      lastReferrer: input.lastReferrer ?? existing[0].lastReferrer,
      updatedAt: new Date(),
    })
    .where(eq(visitors.visitorId, input.visitorId))
    .returning();
  return updated;
}

export async function linkVisitorToUser(visitorId: string, userId: number) {
  const [updated] = await db
    .update(visitors)
    .set({
      knownUserId: userId,
      identityStatus: "authenticated",
      updatedAt: new Date(),
    })
    .where(eq(visitors.visitorId, visitorId))
    .returning();
  return updated;
}

export async function enrichVisitor(
  visitorId: string,
  enrichment: {
    personName?: string;
    workEmail?: string;
    phone?: string;
    jobTitle?: string;
    linkedinUrl?: string;
    companyName?: string;
    companyDomain?: string;
    identityStatus?: "company_identified" | "person_identified";
    identityProvider?: string;
    matchConfidence?: number;
  },
) {
  const existing = await db
    .select()
    .from(visitors)
    .where(eq(visitors.visitorId, visitorId))
    .limit(1);

  if (existing.length === 0) return null;
  const v = existing[0];

  // Never overwrite stronger data with null/weaker
  const [updated] = await db
    .update(visitors)
    .set({
      personName: enrichment.personName ?? v.personName,
      workEmail: enrichment.workEmail ?? v.workEmail,
      phone: enrichment.phone ?? v.phone,
      jobTitle: enrichment.jobTitle ?? v.jobTitle,
      linkedinUrl: enrichment.linkedinUrl ?? v.linkedinUrl,
      companyName: enrichment.companyName ?? v.companyName,
      companyDomain: enrichment.companyDomain ?? v.companyDomain,
      identityStatus: enrichment.identityStatus ?? v.identityStatus,
      identityProvider: enrichment.identityProvider ?? v.identityProvider,
      matchConfidence: enrichment.matchConfidence ?? v.matchConfidence,
      updatedAt: new Date(),
    })
    .where(eq(visitors.visitorId, visitorId))
    .returning();
  return updated;
}

export async function incrementVisitorPageViews(visitorId: string) {
  await db
    .update(visitors)
    .set({
      pageViewCount: sql`${visitors.pageViewCount} + 1`,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(visitors.visitorId, visitorId));
}

export async function updateLeadScore(visitorId: string, delta: number) {
  await db
    .update(visitors)
    .set({
      leadScore: sql`${visitors.leadScore} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(visitors.visitorId, visitorId));
}

export async function upsertSession(input: {
  visitorId: string;
  sessionId: string;
  landingPage?: string;
  referrer?: string;
  device?: string;
  browser?: string;
  os?: string;
}) {
  const existing = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.sessionId, input.sessionId))
    .limit(1);

  if (existing.length === 0) {
    await db.update(visitors).set({
      sessionCount: sql`${visitors.sessionCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(visitors.visitorId, input.visitorId));

    const [created] = await db
      .insert(visitorSessions)
      .values(input)
      .returning();
    return created;
  }

  const [updated] = await db
    .update(visitorSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(visitorSessions.sessionId, input.sessionId))
    .returning();
  return updated;
}

export async function endSession(sessionId: string, exitPage?: string) {
  const [sess] = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.sessionId, sessionId))
    .limit(1);
  if (!sess) return;

  const duration = Math.floor(
    (new Date().getTime() - new Date(sess.startedAt).getTime()) / 1000,
  );

  await db
    .update(visitorSessions)
    .set({
      endedAt: new Date(),
      exitPage: exitPage ?? sess.exitPage,
      durationSeconds: duration,
    })
    .where(eq(visitorSessions.sessionId, sessionId));
}

export async function insertEvent(input: {
  visitorId: string;
  sessionId: string;
  eventName: string;
  pageUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  const [event] = await db.insert(visitorEvents).values(input).returning();
  return event;
}

export async function getVisitorById(visitorId: string) {
  const [visitor] = await db
    .select()
    .from(visitors)
    .where(eq(visitors.visitorId, visitorId))
    .limit(1);
  return visitor ?? null;
}

export async function getVisitorEvents(visitorId: string) {
  return db
    .select()
    .from(visitorEvents)
    .where(eq(visitorEvents.visitorId, visitorId))
    .orderBy(desc(visitorEvents.createdAt));
}

export async function getVisitorSessions(visitorId: string) {
  return db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.visitorId, visitorId))
    .orderBy(desc(visitorSessions.startedAt));
}

export async function listVisitors(params: {
  limit?: number;
  offset?: number;
}) {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const rows = await db
    .select()
    .from(visitors)
    .orderBy(desc(visitors.lastSeenAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getVisitorStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total] = await db.select({ count: count() }).from(visitors);
  const [known] = await db
    .select({ count: count() })
    .from(visitors)
    .where(isNotNull(visitors.knownUserId));
  const [identified] = await db
    .select({ count: count() })
    .from(visitors)
    .where(
      and(
        isNull(visitors.knownUserId),
        sql`${visitors.identityStatus} != 'anonymous'`,
      ),
    );
  const [todayVisitors] = await db
    .select({ count: count() })
    .from(visitors)
    .where(gte(visitors.lastSeenAt, today));
  const [returning] = await db
    .select({ count: count() })
    .from(visitors)
    .where(sql`${visitors.sessionCount} > 1`);

  const totalCount = total.count;
  const knownCount = known.count;
  const identifiedCount = identified.count;
  const anonymousCount = totalCount - knownCount - identifiedCount;

  return {
    total: totalCount,
    known: knownCount,
    identified: identifiedCount,
    anonymous: anonymousCount,
    today: todayVisitors.count,
    returning: returning.count,
  };
}
