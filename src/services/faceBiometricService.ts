import bcrypt from "bcrypt";
import { and, eq, ilike, ne } from "drizzle-orm";
import { db } from "../db/connection.js";
import { Employee, employeeFaceBiometric, organizations, users } from "../db/schema.js";
import { AttendanceService } from "./attendanceServices.js";
import { deleteLocalUpload, saveDataUrlToLocal } from "./uploadService.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const configuredThreshold = Number(process.env.FACE_MATCH_THRESHOLD || 0.42);
const matchThreshold = Number.isFinite(configuredThreshold)
  ? Math.min(0.95, Math.max(0.3, configuredThreshold))
  : 0.42;
const configuredLoginThreshold = Number(process.env.FACE_LOGIN_THRESHOLD || 0.38);
const loginMatchThreshold = Number.isFinite(configuredLoginThreshold)
  ? Math.min(0.95, Math.max(0.25, configuredLoginThreshold))
  : 0.38;

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

function validateOrganizationEmail(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw httpError("Organization email is required", 400, "ORGANIZATION_EMAIL_REQUIRED");
  }
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw httpError("Organization email is invalid", 400, "INVALID_ORGANIZATION_EMAIL");
  }
  return normalized;
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

async function getEmployeeOwnership(employeeId: number) {
  const [employee] = await db
    .select({
      userId: Employee.userId,
      adminId: Employee.adminId,
      organizationId: users.organizationId,
    })
    .from(Employee)
    .innerJoin(users, eq(users.id, Employee.userId))
    .where(eq(Employee.userId, employeeId))
    .limit(1);
  if (!employee) throw httpError("Employee record not found", 404, "EMPLOYEE_NOT_FOUND");
  return employee;
}

async function getProfile(employeeId: number) {
  const [profile] = await db
    .select()
    .from(employeeFaceBiometric)
    .where(eq(employeeFaceBiometric.employeeId, employeeId))
    .limit(1);
  return profile;
}

async function getProfilesForOrganization(organizationId: number, excludedEmployeeId: number) {
  return db
    .select({
      employeeId: employeeFaceBiometric.employeeId,
      embedding: employeeFaceBiometric.embedding,
    })
    .from(employeeFaceBiometric)
    .innerJoin(users, eq(users.id, employeeFaceBiometric.employeeId))
    .where(and(eq(users.organizationId, organizationId), ne(employeeFaceBiometric.employeeId, excludedEmployeeId)));
}

async function getProfilesForOrganizationLogin(organizationId: number) {
  return db
    .select({
      user: users,
      employeeId: employeeFaceBiometric.employeeId,
      embedding: employeeFaceBiometric.embedding,
    })
    .from(employeeFaceBiometric)
    .innerJoin(users, eq(users.id, employeeFaceBiometric.employeeId))
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.type, "employee"),
        eq(users.isDeleted, false),
      ),
    );
}

async function resolveOrganizationIdFromLoginHint(value: unknown) {
  const normalized = validateOrganizationEmail(value);

  const [organizationByEmail] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.organizationEmail, normalized))
    .limit(1);
  if (organizationByEmail) return organizationByEmail.id;

  const [userMatch] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(and(eq(users.email, normalized), eq(users.isDeleted, false)))
    .limit(1);
  if (userMatch?.organizationId) return userMatch.organizationId;

  const domain = normalized.split("@")[1];
  if (domain) {
    const [organizationByDomain] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(ilike(organizations.organizationEmail, `%@${domain}`))
      .limit(1);
    if (organizationByDomain) return organizationByDomain.id;
  }

  throw httpError("Organization not found", 404, "ORGANIZATION_NOT_FOUND");
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

  private async assertFaceIsUniqueWithinOrganization(employeeId: number, embedding: number[]) {
    const employee = await getEmployeeOwnership(employeeId);
    if (!employee.organizationId) {
      throw httpError("Employee organization not found", 404, "ORGANIZATION_NOT_FOUND");
    }
    const profiles = await getProfilesForOrganization(employee.organizationId, employeeId);
    const duplicate = profiles.find((profile) => cosineSimilarity(profile.embedding, embedding) >= matchThreshold);
    if (duplicate) {
      throw httpError(
        "This face is already registered with another employee.",
        409,
        "FACE_ALREADY_REGISTERED",
      );
    }
  }

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
    await this.assertFaceIsUniqueWithinOrganization(user.id, embedding);
    await db
      .insert(employeeFaceBiometric)
      .values({ employeeId: user.id, embedding, provider: "opencv_sface" })
      .onConflictDoUpdate({
        target: employeeFaceBiometric.employeeId,
        set: { embedding, provider: "opencv_sface", updatedAt: new Date() },
      });
    return this.status(user);
  }

  async loginWithFace(image: unknown, organizationEmail: unknown) {
    const organizationId = await resolveOrganizationIdFromLoginHint(organizationEmail);
    const probe = await extractEmbedding(image);
    const profiles = await getProfilesForOrganizationLogin(organizationId);
    const matches = profiles
      .map((profile) => ({
        user: profile.user,
        similarity: cosineSimilarity(profile.embedding, probe),
      }))
      .filter((profile) => profile.similarity >= loginMatchThreshold)
      .sort((left, right) => right.similarity - left.similarity);

    const bestMatch = matches[0];
    if (!bestMatch) {
      throw httpError("Face did not match any registered employee in this organization", 401, "FACE_LOGIN_FAILED");
    }

    if (!bestMatch.user.active) {
      throw httpError("Account is inactive. Please contact administrator.", 403, "ACCOUNT_INACTIVE");
    }

    return {
      user: bestMatch.user,
      confidence: Number((bestMatch.similarity * 100).toFixed(2)),
    };
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
      faceImagePath = await saveDataUrlToLocal(
        capturedImage,
        "face-attendance",
      );
      if (type === "check-in") {
        attendance = await this.attendance.checkInSelf(user, {
          verificationMethod: "face",
          faceImagePath,
        });
      } else {
        attendance = await this.attendance.checkOutSelf(user, {
          verificationMethod: "face",
          faceImagePath,
        });
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
      : await this.attendance.checkOutSelf(user, {
        verificationMethod: "password",
        faceImagePath: null,
      });
    return { type, method: "password", timestamp: new Date().toISOString(), attendance };
  }
}
