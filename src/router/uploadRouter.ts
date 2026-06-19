import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadImageToS3OrLocal } from "../services/uploadService.js";
import { authenticate } from "../middleware/auth.js";
import { get } from "@vercel/blob";

const uploadRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

uploadRouter.post(
  "/image",
  authenticate,
  upload.single("image"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      const host = req.get("host") || "localhost:4000";
      const imageUrl = await uploadImageToS3OrLocal(req.file, host);

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        url: imageUrl,
      });
    } catch (error) {
      console.error("Upload error:", error);
      next(error);
    }
  }
);

uploadRouter.get(
  "/blob",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).send("Missing url query parameter");
        return;
      }

      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        res.status(400).send("No token configured");
        return;
      }

      const result = await get(url, {
        access: "private",
        token: token,
      });

      if (!result) {
        res.status(404).send("Blob not found");
        return;
      }

      if (result.statusCode === 304) {
        res.status(304).end();
        return;
      }

      const { stream, blob } = result;

      res.setHeader("Content-Type", blob.contentType || "image/jpeg");
      
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (error) {
      console.error("Error fetching private blob:", error);
      next(error);
    }
  }
);

export default uploadRouter;
