import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { Employee, employeeFaceBiometric, users } from "../db/schema.js";
import { AttendanceService } from "./attendanceServices.js";
import { deleteLocalUpload, saveDataUrlToLocal } from "./uploadService.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const configuredThreshold = Number(process.env.FACE_MATCH_THRESHOLD || 0.42);
const matchThreshold = Number.isFinite(configuredThreshold)
  ? Math.min(0.95, Math.max(0.3, configuredThreshold))
  : 0.42;

function httpError(message: string, statusCode: number, code?: string) {
  return Object.assign(new Error(message), { statusCode, code });
}

export function normalizeFaceProviderError(error: unknown): Error {
  if (error instanceof Error && "statusCode" in error) return error;
  if (
    error instanceof TypeError ||
    (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name))
  ) {
    return httpError(
      "Face recognition service is unavailable",
      503,
      "FACE_SERVICE_UNAVAILABLE",
    );
  }
  return error instanceof Error ? error : new Error("Face recognition service failed");
}

function validateImage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw httpError("A captured face image is required", 400, "IMAGE_REQUIRED");
  }
  const match = value.match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw httpError("Image must be a base64 JPEG or PNG data URL", 400, "INVALID_IMAGE");
  }
  const approximateBytes = Math.floor((match[2].length * 3) / 4);
  if (!approximateBytes || approximateBytes > MAX_IMAGE_BYTES) {
    throw httpError("Image must be smaller than 5 MB", 413, "IMAGE_TOO_LARGE");
  }
  return value;
}

async function requireEmployee(user: typeof users.$inferSelect) {
  if (user.type !== "employee") {
    throw httpError("Only employees can use face attendance", 403, "EMPLOYEE_ONLY");
  }
  const [employee] = await db
    .select({ userId: Employee.userId })
    .from(Employee)
    .where(eq(Employee.userId, user.id))
    .limit(1);
  if (!employee) throw httpError("Employee record not found", 404, "EMPLOYEE_NOT_FOUND");
}

async function getProfile(employeeId: number) {
  const [profile] = await db
    .select()
    .from(employeeFaceBiometric)
    .where(eq(employeeFaceBiometric.employeeId, employeeId))
    .limit(1);
  return profile;
}

async function extractEmbedding(image: unknown): Promise<number[]> {
  const serviceUrl = process.env.FACE_RECOGNITION_SERVICE_URL?.replace(/\/$/, "");
  if (!serviceUrl) {
    throw httpError(
      "FACE_RECOGNITION_SERVICE_URL is not configured",
      503,
      "FACE_SERVICE_NOT_CONFIGURED",
    );
  }
  const response = await fetch(`${serviceUrl}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.FACE_RECOGNITION_SERVICE_KEY
        ? { "X-Face-Service-Key": process.env.FACE_RECOGNITION_SERVICE_KEY }
        : {}),
    },
    body: JSON.stringify({ image: validateImage(image) }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    embedding?: unknown;
    message?: string;
    code?: string;
    detail?: string | { message?: string; code?: string };
  };
  if (!response.ok) {
    const detail = typeof payload.detail === "object" ? payload.detail : undefined;
    const message = detail?.message || payload.message ||
      (typeof payload.detail === "string" ? payload.detail : "Face processing failed");
    throw httpError(message, response.status, detail?.code || payload.code || "FACE_PROCESSING_FAILED");
  }
  if (
    !Array.isArray(payload.embedding) ||
    payload.embedding.length !== 128 ||
    !payload.embedding.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    throw httpError("Face service returned an invalid embedding", 502, "INVALID_FACE_EMBEDDING");
  }
  return payload.embedding as number[];
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || !left.length) return -1;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export class FaceBiometricService {
  private attendance = new AttendanceService();

  async status(user: typeof users.$inferSelect) {
    await requireEmployee(user);
    const profile = await getProfile(user.id);
    return {
      faceRegistered: Boolean(profile),
      faceUpdatedAt: profile?.updatedAt ?? null,
      faceImage: null,
    };
  }

  async register(image: unknown, user: typeof users.$inferSelect) {
    await requireEmployee(user);
    const embedding = await extractEmbedding(image);
    await db
      .insert(employeeFaceBiometric)
      .values({ employeeId: user.id, embedding, provider: "opencv_sface" })
      .onConflictDoUpdate({
        target: employeeFaceBiometric.employeeId,
        set: { embedding, provider: "opencv_sface", updatedAt: new Date() },
      });
    return this.status(user);
  }

  async verify(image: unknown, user: typeof users.$inferSelect) {
    await requireEmployee(user);
    const profile = await getProfile(user.id);
    if (!profile) {
      throw httpError("Register your face before using face attendance", 409, "FACE_NOT_REGISTERED");
    }
    const probe = await extractEmbedding(image);
    const similarity = cosineSimilarity(profile.embedding, probe);
    if (similarity < matchThreshold) {
      throw httpError("Face did not match the registered biometric profile", 401, "FACE_MISMATCH");
    }
    return { matched: true, confidence: Number((similarity * 100).toFixed(2)) };
  }

  async verifyAndMark(image: unknown, type: unknown, user: typeof users.$inferSelect) {
    const capturedImage = validateImage(image);
    const verification = await this.verify(capturedImage, user);
    if (type !== "check-in" && type !== "check-out") {
      throw httpError("type must be check-in or check-out", 400, "INVALID_ATTENDANCE_TYPE");
    }
    let faceImagePath: string | null = null;
    let attendance;
    try {
      if (type === "check-in") {
        faceImagePath = await saveDataUrlToLocal(
          capturedImage,
          "face-attendance",
        );
        attendance = await this.attendance.checkInSelf(user, {
          verificationMethod: "face",
          faceImagePath,
        });
      } else {
        attendance = await this.attendance.checkOutSelf(user);
      }
    } catch (error) {
      if (faceImagePath) {
        await deleteLocalUpload(faceImagePath).catch((cleanupError) => {
          console.error("Unable to clean up failed face attendance upload", cleanupError);
        });
      }
      throw error;
    }
    return { type, method: "face", timestamp: new Date().toISOString(), verification, attendance };
  }

  async verifyPasswordAndMark(password: unknown, type: unknown, user: typeof users.$inferSelect) {
    await requireEmployee(user);
    if (typeof password !== "string" || !password) {
      throw httpError("Password is required", 400, "PASSWORD_REQUIRED");
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw httpError("Incorrect password", 401, "INVALID_PASSWORD");
    }
    if (type !== "check-in" && type !== "check-out") {
      throw httpError("type must be check-in or check-out", 400, "INVALID_ATTENDANCE_TYPE");
    }
    const attendance = type === "check-in"
      ? await this.attendance.checkInSelf(user, {
        verificationMethod: "password",
        faceImagePath: null,
      })
      : await this.attendance.checkOutSelf(user);
    return { type, method: "password", timestamp: new Date().toISOString(), attendance };
  }
}
