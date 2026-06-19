import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Trigger restart to load new env
export async function uploadImageToS3OrLocal(
  file: Express.Multer.File,
  reqHost: string
): Promise<string> {
  const extension = path.extname(file.originalname) || ".jpg";
  const uniqueName = `${crypto.randomUUID()}${extension}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      console.log(`Uploading to Vercel Blob under uploads/${uniqueName}`);
      const blob = await put(`uploads/${uniqueName}`, file.buffer, {
        access: "private",
        contentType: file.mimetype,
        token: token,
      });
      return blob.url;
    } catch (error) {
      console.error("Vercel Blob upload failed, falling back to local:", error);
    }
  }

  // Local fallback (or if Vercel Blob upload errored/no token configured)
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(filePath, file.buffer);

  // Return local server URL
  const protocol = reqHost.includes("localhost") || reqHost.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${reqHost}/uploads/${uniqueName}`;
}
