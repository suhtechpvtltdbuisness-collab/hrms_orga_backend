import { Router } from "express";
import { authenticate, authorizeSuperAdmin } from "../middleware/auth.js";
import {
  identifyVisitor,
  trackEvents,
  updateSession,
  linkUser,
  handleWebhook,
  adminListVisitors,
  adminGetVisitor,
  adminGetVisitorEvents,
} from "../controllers/visitorController.js";

const router = Router();

// Public tracking endpoints — rate limited by upstream proxy in production
router.post("/visitors/identify", identifyVisitor);
router.post("/visitors/events", trackEvents);
router.post("/visitors/session", updateSession);

// Authenticated — links a visitor to the logged-in user
router.post("/visitors/link-user", authenticate, linkUser);

// Webhook from identity provider
router.post("/webhooks/visitor-identity", handleWebhook);

router.get("/admin/visitors", authenticate, authorizeSuperAdmin, adminListVisitors);
router.get("/admin/visitors/:visitorId", authenticate, authorizeSuperAdmin, adminGetVisitor);
router.get("/admin/visitors/:visitorId/events", authenticate, authorizeSuperAdmin, adminGetVisitorEvents);

export default router;
