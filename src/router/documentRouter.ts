import { Router } from "express";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  getDocumentsByEmployeeId,
  updateDocument,
  deleteDocument,
} from "../controllers/documentController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticate, createDocument);
router.get("/", authenticate, getAllDocuments);
router.get("/:id", authenticate, getDocumentById);
router.get("/employee/:empId", authenticate, getDocumentsByEmployeeId);
router.put("/:id", authenticate, updateDocument);
router.delete("/:id", authenticate, deleteDocument);

export default router;
