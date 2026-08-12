import { Router } from "express";
import { authenticate, authorizeAdmin } from "../middleware/auth.js";
import {
  announcementStats,
  createAnnouncement,
  deleteAnnouncement,
  duplicateAnnouncement,
  getAnnouncement,
  getEmployeeAnnouncement,
  listAnnouncements,
  listEmployeeAnnouncements,
  setAnnouncementRead,
  updateAnnouncement,
  updateAnnouncementStatus,
} from "../controllers/announcementController.js";

const router = Router();

// Employee-facing (any authenticated org user)
router.get("/employee", authenticate, listEmployeeAnnouncements);
router.get("/employee/:id", authenticate, getEmployeeAnnouncement);
router.patch("/:id/read", authenticate, setAnnouncementRead);

// Admin HRMS management
router.get("/stats", authenticate, authorizeAdmin, announcementStats);
router.get("/", authenticate, authorizeAdmin, listAnnouncements);
router.get("/:id", authenticate, authorizeAdmin, getAnnouncement);
router.post("/", authenticate, authorizeAdmin, createAnnouncement);
router.put("/:id", authenticate, authorizeAdmin, updateAnnouncement);
router.patch("/:id/status", authenticate, authorizeAdmin, updateAnnouncementStatus);
router.post("/:id/duplicate", authenticate, authorizeAdmin, duplicateAnnouncement);
router.delete("/:id", authenticate, authorizeAdmin, deleteAnnouncement);

export default router;
