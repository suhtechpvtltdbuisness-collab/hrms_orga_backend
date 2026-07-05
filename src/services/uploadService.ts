import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PUBLIC_UPLOADS_PATH = "/uploads";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function getUploadsDirectory(): string {
  return path.resolve(
    process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"),
  );
}

async function ensureUploadDirectory(subdirectory?: string): Promise<string> {
  const uploadDir = subdirectory
    ? path.join(getUploadsDirectory(), subdirectory)
    : getUploadsDirectory();
  await fs.promises.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

export async function saveDataUrlToLocal(
  dataUrl: string,
  subdirectory: string,
): Promise<string> {
  if (!/^[a-z0-9-]+$/i.test(subdirectory)) {
    throw new Error("Invalid upload subdirectory");
  }

  const match = dataUrl.match(
    /^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match) throw new Error("Invalid image data URL");

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 5 MB");
  }

  const extension = match[1] === "png" ? ".png" : ".jpg";
  const uniqueName = `${crypto.randomUUID()}${extension}`;
  const uploadDir = await ensureUploadDirectory(subdirectory);
  await fs.promises.writeFile(path.join(uploadDir, uniqueName), buffer, {
    flag: "wx",
  });

  return path.posix.join(PUBLIC_UPLOADS_PATH, subdirectory, uniqueName);
}

export async function deleteLocalUpload(publicPath: string): Promise<void> {
  const relativePath = publicPath.replace(/^\/uploads\/?/, "");
  const uploadsDirectory = getUploadsDirectory();
  const absolutePath = path.resolve(uploadsDirectory, relativePath);
  if (!absolutePath.startsWith(`${uploadsDirectory}${path.sep}`)) return;

  await fs.promises.unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}


export async function uploadImageToS3OrLocal(
  file: Express.Multer.File,
  reqHost: string
): Promise<string> {
  const extension = path.extname(file.originalname) || ".jpg";
  const uniqueName = `${crypto.randomUUID()}${extension}`;

  const uploadDir = await ensureUploadDirectory();

  const filePath = path.join(uploadDir, uniqueName);
  await fs.promises.writeFile(filePath, file.buffer, { flag: "wx" });

  const protocol =
    reqHost.includes("localhost") || reqHost.includes("127.0.0.1")
      ? "http"
      : "https";

  return `${protocol}://${reqHost}/uploads/${uniqueName}`;
}
