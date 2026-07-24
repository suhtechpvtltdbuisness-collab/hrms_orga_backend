import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { uploadImageToS3OrLocal, getUploadsDirectory } from "../services/uploadService.js";
import { authenticate } from "../middleware/auth.js";
import { get } from "@vercel/blob";

const uploadRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

function resolveLocalUploadPath(urlOrPath: string): string | null {
  try {
    const pathname = /^(https?:)?\/\//i.test(urlOrPath)
      ? new URL(urlOrPath).pathname
      : urlOrPath;
    if (!pathname.startsWith("/uploads/")) return null;

    const relativePath = pathname.replace(/^\/uploads\/?/, "");
    if (!relativePath || relativePath.includes("..")) return null;

    const uploadsDirectory = getUploadsDirectory();
    const absolutePath = path.resolve(uploadsDirectory, relativePath);
    if (!absolutePath.startsWith(`${uploadsDirectory}${path.sep}`)) return null;
    return absolutePath;
  } catch {
    return null;
  }
}

async function streamLocalFile(filePath: string, res: Response): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".pdf"
      ? "application/pdf"
      : ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(res);
  });
  return true;
}

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

uploadRouter.post(
  "/documents",
  authenticate,
  upload.array("documents", 20),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files?.length) {
        res.status(400).json({ success: false, message: "No files uploaded" });
        return;
      }

      const allowedTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
      ]);
      if (files.some((file) => !allowedTypes.has(file.mimetype))) {
        res.status(400).json({
          success: false,
          message: "Documents must be PDF, JPG, or PNG files",
        });
        return;
      }

      const host = req.get("host") || "localhost:4000";
      const uploadedFiles = await Promise.all(
        files.map(async (file) => ({
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          url: await uploadImageToS3OrLocal(file, host),
        })),
      );

      res.status(200).json({
        success: true,
        message: "Documents uploaded successfully",
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("Document upload error:", error);
      next(error);
    }
  },
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

      // Local / Railway uploads — serve from disk instead of Vercel Blob.
      const localPath = resolveLocalUploadPath(url);
      if (localPath) {
        const served = await streamLocalFile(localPath, res);
        if (served) return;
        res.status(404).send("File not found");
        return;
      }

      if (!url.includes("blob.vercel-storage.com")) {
        res.status(400).send("Unsupported file URL");
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
