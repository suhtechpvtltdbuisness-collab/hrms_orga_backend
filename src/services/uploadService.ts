import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import crypto from "crypto";


export async function uploadImageToS3OrLocal(
  file: Express.Multer.File,
  reqHost: string
): Promise<string> {
  const extension = path.extname(file.originalname) || ".jpg";
  const uniqueName = `${crypto.randomUUID()}${extension}`;

  const uploadDir = path.join(process.cwd(), "uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, uniqueName);
  fs.writeFileSync(filePath, file.buffer);

  const protocol =
    reqHost.includes("localhost") || reqHost.includes("127.0.0.1")
      ? "http"
      : "https";

  return `${protocol}://${reqHost}/uploads/${uniqueName}`;
}