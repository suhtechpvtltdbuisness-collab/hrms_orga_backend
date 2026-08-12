import { users } from "../db/schema.js";
import { AnnouncementRepository } from "../repository/announcement.repo.js";

type CurrentUser = typeof users.$inferSelect;

const STATUSES = ["Draft", "Published", "Scheduled", "Archived"] as const;
const PRIORITIES = ["Normal", "Important", "Urgent"] as const;
const TYPES = [
  "Company Update",
  "Policy",
  "Event",
  "Maintenance",
  "Benefits",
  "Recognition",
] as const;
const AUDIENCES = [
  "All Employees",
  "Specific Departments",
  "Specific Employees",
  "Managers/Admins",
] as const;

function getOrgId(currentUser: CurrentUser) {
  if (!currentUser?.organizationId) {
    throw Object.assign(new Error("User does not belong to any organization"), {
      statusCode: 400,
    });
  }
  return currentUser.organizationId;
}

function stripHtml(value: string) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function parseDateTime(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw Object.assign(new Error("Invalid date/time value"), { statusCode: 400 });
  }
  return d;
}

function normalizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((file, index) => ({
    id: String(file?.id || `file-${Date.now()}-${index}`),
    name: String(file?.name || "attachment"),
    size: String(file?.size || ""),
    type: String(file?.type || "FILE"),
    ...(file?.url ? { url: String(file.url) } : {}),
  }));
}

function mapAnnouncement(row: any, extras: Record<string, unknown> = {}) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    type: row.type,
    priority: row.priority,
    audience: row.audience,
    departments: row.departments || [],
    employees: row.employees || [],
    author: row.author,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt || undefined,
    scheduledAt: row.scheduledAt || undefined,
    expiryDate: row.expiryDate || "",
    attachments: row.attachments || [],
    reads: Number(row.reads || 0),
    recipients: Number(row.recipients || 0),
    createdBy: row.createdBy,
    ...extras,
  };
}

function isExpired(expiryDate?: string | null) {
  if (!expiryDate) return false;
  return new Date(`${expiryDate}T23:59:59`) < new Date();
}

function canEmployeeView(
  item: any,
  employee: {
    id: number;
    name: string;
    email: string;
    roleId: number;
    type: string;
    isAdmin: boolean;
    departmentName?: string | null;
  },
) {
  if (!item || item.status !== "Published") return false;
  if (isExpired(item.expiryDate)) return false;

  if (item.audience === "All Employees") return true;

  if (item.audience === "Specific Departments") {
    return Boolean(
      employee.departmentName &&
        Array.isArray(item.departments) &&
        item.departments.includes(employee.departmentName),
    );
  }

  if (item.audience === "Specific Employees") {
    const identities = [employee.id, employee.name, employee.email]
      .filter(Boolean)
      .map(String);
    return (item.employees || []).some((value: unknown) =>
      identities.includes(String(value)),
    );
  }

  if (item.audience === "Managers/Admins") {
    return (
      employee.roleId === 0 ||
      employee.roleId === 1 ||
      employee.type === "manager" ||
      employee.isAdmin === true
    );
  }

  return false;
}

export class AnnouncementServices {
  private repo = new AnnouncementRepository();

  private async resolveRecipients(
    organizationId: number,
    audience: string,
    departments: string[],
    employees: string[],
  ) {
    if (audience === "Specific Employees") return employees.length;
    if (audience === "Specific Departments") {
      return this.repo.countEmployeesInDepartments(organizationId, departments);
    }
    if (audience === "Managers/Admins") {
      return this.repo.countManagersAdmins(organizationId);
    }
    return this.repo.countOrgEmployees(organizationId);
  }

  private validatePayload(body: any, { requireContent = true } = {}) {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const content = String(body.content || "");
    const type = TYPES.includes(body.type) ? body.type : "Company Update";
    const priority = PRIORITIES.includes(body.priority) ? body.priority : "Normal";
    const audience = AUDIENCES.includes(body.audience)
      ? body.audience
      : "All Employees";
    const departments = Array.isArray(body.departments)
      ? body.departments.map(String)
      : [];
    const employees = Array.isArray(body.employees)
      ? body.employees.map(String)
      : [];

    if (requireContent) {
      if (!title) {
        throw Object.assign(new Error("Title is required"), { statusCode: 400 });
      }
      if (!description) {
        throw Object.assign(new Error("Short description is required"), {
          statusCode: 400,
        });
      }
      if (!stripHtml(content)) {
        throw Object.assign(new Error("Announcement content is required"), {
          statusCode: 400,
        });
      }
      if (audience === "Specific Departments" && !departments.length) {
        throw Object.assign(new Error("Select at least one department"), {
          statusCode: 400,
        });
      }
      if (audience === "Specific Employees" && !employees.length) {
        throw Object.assign(new Error("Select at least one employee"), {
          statusCode: 400,
        });
      }
    }

    return {
      title,
      description,
      content,
      type,
      priority,
      audience,
      departments:
        audience === "All Employees"
          ? ["All departments"]
          : audience === "Specific Departments"
            ? departments
            : [],
      employees: audience === "Specific Employees" ? employees : [],
      expiryDate: body.expiryDate ? String(body.expiryDate).slice(0, 10) : null,
      attachments: normalizeAttachments(body.attachments),
      author: body.author ? String(body.author).trim() : undefined,
    };
  }

  async list(currentUser: CurrentUser, query: any = {}) {
    const orgId = getOrgId(currentUser);
    const data = await this.repo.list(orgId, {
      status: query.status,
      priority: query.priority,
      audience: query.audience,
      department: query.department,
      query: query.q || query.query || query.search,
      sort: query.sort,
    });
    return { success: true, data: data.map((row) => mapAnnouncement(row)) };
  }

  async stats(currentUser: CurrentUser) {
    const data = await this.repo.getStats(getOrgId(currentUser));
    return { success: true, data };
  }

  async get(id: number, currentUser: CurrentUser) {
    const data = await this.repo.getById(id, getOrgId(currentUser));
    if (!data) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }
    return { success: true, data: mapAnnouncement(data) };
  }

  async create(body: any, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const payload = this.validatePayload(body);
    let status = STATUSES.includes(body.status) ? body.status : "Draft";

    if (body.publishOption === "Schedule" || status === "Scheduled") {
      status = "Scheduled";
      if (!body.scheduledAt) {
        throw Object.assign(new Error("Select a schedule date and time"), {
          statusCode: 400,
        });
      }
    }

    const now = new Date();
    const scheduledAt =
      status === "Scheduled" ? parseDateTime(body.scheduledAt) : null;
    const publishedAt =
      status === "Published"
        ? parseDateTime(body.publishedAt) || now
        : null;

    const recipients = await this.resolveRecipients(
      orgId,
      payload.audience,
      payload.departments.filter((d: string) => d !== "All departments"),
      payload.employees,
    );

    const created = await this.repo.create({
      organizationId: orgId,
      title: payload.title,
      description: payload.description,
      content: payload.content,
      type: payload.type,
      priority: payload.priority,
      audience: payload.audience,
      departments: payload.departments,
      employees: payload.employees,
      author: payload.author || currentUser.name,
      status,
      publishedAt,
      scheduledAt,
      expiryDate: payload.expiryDate,
      attachments: payload.attachments,
      recipients,
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Announcement created",
      data: mapAnnouncement(created),
    };
  }

  async update(id: number, body: any, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const existing = await this.repo.getById(id, orgId);
    if (!existing) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }

    const payload = this.validatePayload({ ...existing, ...body });
    let status = body.status && STATUSES.includes(body.status)
      ? body.status
      : existing.status;

    if (body.publishOption === "Schedule") {
      status = "Scheduled";
      if (!body.scheduledAt && !existing.scheduledAt) {
        throw Object.assign(new Error("Select a schedule date and time"), {
          statusCode: 400,
        });
      }
    }

    const recipients = await this.resolveRecipients(
      orgId,
      payload.audience,
      payload.departments.filter((d: string) => d !== "All departments"),
      payload.employees,
    );

    let publishedAt = existing.publishedAt;
    let scheduledAt = existing.scheduledAt;

    if (status === "Published") {
      publishedAt = parseDateTime(body.publishedAt) || existing.publishedAt || new Date();
      scheduledAt = null;
    } else if (status === "Scheduled") {
      scheduledAt = parseDateTime(body.scheduledAt) || existing.scheduledAt;
      if (!scheduledAt) {
        throw Object.assign(new Error("Select a schedule date and time"), {
          statusCode: 400,
        });
      }
    } else if (status === "Draft") {
      if (body.publishedAt === undefined || body.publishedAt === null) {
        // keep existing unless explicitly cleared via status actions
      }
      if (body.scheduledAt === null || body.scheduledAt === undefined) {
        if (existing.status === "Scheduled" && status === "Draft") {
          scheduledAt = null;
        }
      }
    }

    if ("publishedAt" in body && (body.publishedAt === null || body.publishedAt === undefined)) {
      publishedAt = null;
    }
    if ("scheduledAt" in body && (body.scheduledAt === null || body.scheduledAt === undefined)) {
      scheduledAt = null;
    }
    if (body.scheduledAt) {
      scheduledAt = parseDateTime(body.scheduledAt);
    }

    const updated = await this.repo.update(id, orgId, {
      title: payload.title,
      description: payload.description,
      content: payload.content,
      type: payload.type,
      priority: payload.priority,
      audience: payload.audience,
      departments: payload.departments,
      employees: payload.employees,
      author: payload.author || existing.author,
      status,
      publishedAt,
      scheduledAt,
      expiryDate: payload.expiryDate,
      attachments: payload.attachments,
      recipients,
    });

    return {
      success: true,
      message: "Announcement updated",
      data: mapAnnouncement(updated),
    };
  }

  async updateStatus(id: number, action: string, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const existing = await this.repo.getById(id, orgId);
    if (!existing) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }

    const key = String(action || "").toLowerCase().replace(/\s+/g, "_");
    let patch: Partial<typeof existing> = {};

    if (key === "publish") {
      patch = {
        status: "Published",
        publishedAt: new Date(),
        scheduledAt: null,
      };
    } else if (key === "archive") {
      patch = { status: "Archived" };
    } else if (key === "unpublish") {
      patch = { status: "Draft", publishedAt: null };
    } else if (key === "cancel_schedule" || key === "cancel-schedule") {
      patch = { status: "Draft", scheduledAt: null };
    } else {
      throw Object.assign(
        new Error("Invalid status action. Use publish, archive, unpublish, or cancel_schedule"),
        { statusCode: 400 },
      );
    }

    const updated = await this.repo.update(id, orgId, patch as any);
    return {
      success: true,
      message: "Announcement status updated",
      data: mapAnnouncement(updated),
    };
  }

  async remove(id: number, currentUser: CurrentUser) {
    const data = await this.repo.softDelete(id, getOrgId(currentUser));
    if (!data) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }
    return { success: true, message: "Announcement deleted", data };
  }

  async duplicate(id: number, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const source = await this.repo.getById(id, orgId);
    if (!source) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }

    const created = await this.repo.create({
      organizationId: orgId,
      title: `Copy of ${source.title}`,
      description: source.description,
      content: source.content,
      type: source.type,
      priority: source.priority,
      audience: source.audience,
      departments: source.departments || [],
      employees: source.employees || [],
      author: currentUser.name || source.author,
      status: "Draft",
      publishedAt: null,
      scheduledAt: null,
      expiryDate: source.expiryDate,
      attachments: source.attachments || [],
      recipients: source.recipients,
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "Draft duplicated",
      data: mapAnnouncement(created),
    };
  }

  async listForEmployee(currentUser: CurrentUser, query: any = {}) {
    const orgId = getOrgId(currentUser);
    const employee = await this.repo.getEmployeeContext(currentUser.id, orgId);
    if (!employee) {
      throw Object.assign(new Error("Employee profile not found"), {
        statusCode: 404,
      });
    }

    const published = await this.repo.listPublished(orgId);
    const visible = published.filter((item) => canEmployeeView(item, employee));
    const readIds = await this.repo.getReadIds(
      currentUser.id,
      visible.map((item) => item.id),
    );

    let data = visible.map((item) =>
      mapAnnouncement(item, { isRead: readIds.has(item.id) }),
    );

    const search = String(query.q || query.query || query.search || "")
      .trim()
      .toLowerCase();
    if (search) {
      data = data.filter((item) =>
        `${item.title} ${item.description} ${item.author}`
          .toLowerCase()
          .includes(search),
      );
    }
    if (query.priority && query.priority !== "All") {
      data = data.filter((item) => item.priority === query.priority);
    }
    if (query.readFilter === "Read") data = data.filter((item) => item.isRead);
    if (query.readFilter === "Unread") data = data.filter((item) => !item.isRead);

    return {
      success: true,
      data,
      meta: {
        unread: data.filter((item) => !item.isRead).length,
        urgent: data.filter((item) => item.priority === "Urgent").length,
      },
    };
  }

  async getForEmployee(id: number, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const employee = await this.repo.getEmployeeContext(currentUser.id, orgId);
    if (!employee) {
      throw Object.assign(new Error("Employee profile not found"), {
        statusCode: 404,
      });
    }

    const item = await this.repo.getById(id, orgId);
    if (!item || !canEmployeeView(item, employee)) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }

    const isRead = await this.repo.isRead(id, currentUser.id);
    return {
      success: true,
      data: mapAnnouncement(item, { isRead }),
    };
  }

  async setRead(id: number, read: boolean, currentUser: CurrentUser) {
    const orgId = getOrgId(currentUser);
    const employee = await this.repo.getEmployeeContext(currentUser.id, orgId);
    if (!employee) {
      throw Object.assign(new Error("Employee profile not found"), {
        statusCode: 404,
      });
    }

    const item = await this.repo.getById(id, orgId);
    if (!item || !canEmployeeView(item, employee)) {
      throw Object.assign(new Error("Announcement not found"), { statusCode: 404 });
    }

    if (read) await this.repo.markRead(id, currentUser.id, orgId);
    else await this.repo.markUnread(id, currentUser.id);

    return {
      success: true,
      message: read ? "Marked as read" : "Marked as unread",
      data: { id, isRead: read },
    };
  }
}
