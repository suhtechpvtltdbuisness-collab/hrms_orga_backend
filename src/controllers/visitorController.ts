import { Request, Response } from "express";
import * as repo from "../repository/visitorRepository.js";
import { getIdentityProvider } from "../services/identityProvider.js";
import { scoreEvent } from "../config/leadScoring.js";

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress;
}

// POST /api/visitors/identify
export async function identifyVisitor(req: Request, res: Response) {
  const { visitorId, sessionId, pageUrl, referrer, utm, device } = req.body;
  if (!visitorId) {
    res.status(400).json({ success: false, message: "visitorId required" });
    return;
  }

  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"];

  const visitor = await repo.upsertVisitor({
    visitorId,
    firstPage: pageUrl,
    lastPage: pageUrl,
    firstReferrer: referrer,
    lastReferrer: referrer,
    utmSource: utm?.source,
    utmMedium: utm?.medium,
    utmCampaign: utm?.campaign,
    utmTerm: utm?.term,
    utmContent: utm?.content,
    ipAddress: ip,
  });

  if (sessionId) {
    await repo.upsertSession({
      visitorId,
      sessionId,
      landingPage: pageUrl,
      referrer,
      device: device?.type,
      browser: device?.browser,
      os: device?.os,
    });
  }

  // Run identity enrichment async — don't block the response
  setImmediate(async () => {
    const provider = getIdentityProvider();
    if (provider.name === "none") return;

    const existingVisitor = await repo.getVisitorById(visitorId);
    if (existingVisitor?.identityStatus === "authenticated") return;

    try {
      const result = await provider.identifyVisitor({
        visitorId,
        ip,
        userAgent: userAgent as string,
        pageUrl,
      });

      if (!result || !result.identified) return;

      const identityStatus = result.person?.workEmail
        ? "person_identified"
        : result.company?.name
          ? "company_identified"
          : undefined;

      if (identityStatus) {
        await repo.enrichVisitor(visitorId, {
          personName: result.person?.name,
          workEmail: result.person?.workEmail,
          phone: result.person?.phone,
          jobTitle: result.person?.jobTitle,
          linkedinUrl: result.person?.linkedinUrl,
          companyName: result.company?.name,
          companyDomain: result.company?.domain,
          identityStatus,
          identityProvider: provider.name,
          matchConfidence: result.matchConfidence,
        });

        const delta = scoreEvent(identityStatus);
        if (delta > 0) await repo.updateLeadScore(visitorId, delta);
      }
    } catch (err) {
      console.error("[visitor] enrichment error:", err);
    }
  });

  res.json({ success: true, data: { visitorId: visitor.visitorId } });
}

// POST /api/visitors/events
export async function trackEvents(req: Request, res: Response) {
  const { visitorId, sessionId, events } = req.body;
  if (!visitorId || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ success: false, message: "visitorId and events[] required" });
    return;
  }

  for (const evt of events.slice(0, 50)) {
    if (!evt.eventName) continue;
    await repo.insertEvent({
      visitorId,
      sessionId: sessionId ?? "unknown",
      eventName: evt.eventName,
      pageUrl: evt.pageUrl,
      metadata: evt.metadata,
    });

    const delta = scoreEvent(evt.eventName);
    if (delta > 0) await repo.updateLeadScore(visitorId, delta);

    if (evt.eventName === "page_view") {
      await repo.incrementVisitorPageViews(visitorId);
    }
  }

  res.json({ success: true });
}

// POST /api/visitors/session
export async function updateSession(req: Request, res: Response) {
  const { visitorId, sessionId, action, exitPage, device } = req.body;
  if (!visitorId || !sessionId) {
    res.status(400).json({ success: false, message: "visitorId and sessionId required" });
    return;
  }

  if (action === "end") {
    await repo.endSession(sessionId, exitPage);
  } else {
    await repo.upsertSession({
      visitorId,
      sessionId,
      device: device?.type,
      browser: device?.browser,
      os: device?.os,
    });
  }

  res.json({ success: true });
}

// POST /api/visitors/link-user
export async function linkUser(req: Request, res: Response) {
  const { visitorId } = req.body;
  const user = res.locals.user;

  if (!visitorId) {
    res.status(400).json({ success: false, message: "visitorId required" });
    return;
  }

  await repo.linkVisitorToUser(visitorId, user.id);
  res.json({ success: true });
}

// POST /api/webhooks/visitor-identity
export async function handleWebhook(req: Request, res: Response) {
  const secret = process.env.VISITOR_IDENTITY_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers["x-webhook-secret"] || req.headers["x-signature"];
    if (sig !== secret) {
      res.status(401).json({ success: false, message: "Invalid webhook signature" });
      return;
    }
  }

  const { visitorId, person, company, matchConfidence } = req.body;
  if (!visitorId) {
    res.status(400).json({ success: false, message: "visitorId required" });
    return;
  }

  const identityStatus = person?.workEmail
    ? "person_identified"
    : company?.name
      ? "company_identified"
      : undefined;

  if (identityStatus) {
    await repo.enrichVisitor(visitorId, {
      personName: person?.name,
      workEmail: person?.workEmail,
      phone: person?.phone,
      jobTitle: person?.jobTitle,
      linkedinUrl: person?.linkedinUrl,
      companyName: company?.name,
      companyDomain: company?.domain,
      identityStatus,
      identityProvider: "webhook",
      matchConfidence,
    });
    const delta = scoreEvent(identityStatus);
    if (delta > 0) await repo.updateLeadScore(visitorId, delta);
  }

  res.json({ success: true });
}

// GET /api/admin/visitors
export async function adminListVisitors(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const [rows, stats] = await Promise.all([
    repo.listVisitors({ limit, offset }),
    repo.getVisitorStats(),
  ]);

  res.json({ success: true, data: { visitors: rows, stats, limit, offset } });
}

// GET /api/admin/visitors/:visitorId
export async function adminGetVisitor(req: Request, res: Response) {
  const { visitorId } = req.params;
  const visitor = await repo.getVisitorById(visitorId);
  if (!visitor) {
    res.status(404).json({ success: false, message: "Visitor not found" });
    return;
  }

  const [sessions, events] = await Promise.all([
    repo.getVisitorSessions(visitorId),
    repo.getVisitorEvents(visitorId),
  ]);

  res.json({ success: true, data: { visitor, sessions, events } });
}

// GET /api/admin/visitors/:visitorId/events
export async function adminGetVisitorEvents(req: Request, res: Response) {
  const { visitorId } = req.params;
  const events = await repo.getVisitorEvents(visitorId);
  res.json({ success: true, data: events });
}
