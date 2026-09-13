import { users } from "../db/schema.js";
import { ProjectRepository } from "../repository/project.repo.js";

type CurrentUser = typeof users.$inferSelect;

const PROJECT_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "COMPLETED",
  "BLOCKED",
] as const;
const PROJECT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const EMPLOYEE_STATUS_TRANSITIONS: Record<string, string[]> = {
  TODO: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["TODO", "IN_REVIEW", "BLOCKED", "COMPLETED"],
  IN_REVIEW: ["IN_PROGRESS", "BLOCKED", "COMPLETED"],
  BLOCKED: ["TODO", "IN_PROGRESS"],
  COMPLETED: ["IN_PROGRESS", "COMPLETED"],
};

function getOrgId(currentUser: CurrentUser) {
  if (!currentUser?.organizationId) {
    throw Object.assign(new Error("User does not belong to any organization"), {
      statusCode: 400,
    });
  }
  return currentUser.organizationId;
}

function isProjectManager(currentUser: CurrentUser) {
  return (
    currentUser.isAdmin === true ||
    currentUser.roleId === 0 ||
    currentUser.roleId === 1 ||
    currentUser.type === "manager"
  );
}

function parseOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).slice(0, 10);
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return text;
}

function parseOptionalInt(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });
  }
  return parsed;
}

function clampProgress(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw Object.assign(new Error("Progress must be a number"), { statusCode: 400 });
  }
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function validateDateRange(startDate: string | null, dueDate: string | null) {
  if (startDate && dueDate && dueDate < startDate) {
    throw Object.assign(new Error("Due date must be after start date"), {
      statusCode: 400,
    });
  }
}

function normalizeStatus(value: unknown, fallback: (typeof PROJECT_STATUSES)[number] = "TODO") {
  return PROJECT_STATUSES.includes(String(value) as any)
    ? (String(value) as (typeof PROJECT_STATUSES)[number])
    : fallback;
}

function normalizePriority(
  value: unknown,
  fallback: (typeof PROJECT_PRIORITIES)[number] = "MEDIUM",
) {
  return PROJECT_PRIORITIES.includes(String(value) as any)
    ? (String(value) as (typeof PROJECT_PRIORITIES)[number])
    : fallback;
}

function page(items: any[]) {
  return {
    items,
    pagination: {
      page: 1,
      limit: items.length,
      total: items.length,
    },
  };
}

function mapProject(row: any) {
  if (!row) return null;
  return {
    id: row.project.id,
    name: row.project.name,
    description: row.project.description || "",
    status: row.project.status,
    priority: row.project.priority,
    progress: Number(row.project.progress || 0),
    startDate: row.project.startDate || "",
    dueDate: row.project.dueDate || "",
    memberCount: Number(row.memberCount || 0),
    taskCount: Number(row.taskCount || 0),
    completedTaskCount: Number(row.completedTaskCount || 0),
    createdAt: row.project.createdAt,
    updatedAt: row.project.updatedAt,
    owner: row.ownerId
      ? {
          id: row.ownerId,
          name: row.ownerName,
          email: row.ownerEmail,
        }
      : null,
  };
}

function mapTask(row: any) {
  if (!row) return null;
  return {
    id: row.task.id,
    projectId: row.task.projectId,
    projectName: row.projectName,
    title: row.task.title,
    description: row.task.description || "",
    status: row.task.status,
    priority: row.task.priority,
    progress: Number(row.task.progress || 0),
    startDate: row.task.startDate || "",
    dueDate: row.task.dueDate || "",
    createdAt: row.task.createdAt,
    updatedAt: row.task.updatedAt,
    assigneeId: row.task.assigneeId,
    assignee: row.assigneeId
      ? {
          id: row.assigneeId,
          name: row.assigneeName,
          email: row.assigneeEmail,
        }
      : null,
    project: {
      id: row.task.projectId,
      name: row.projectName,
    },
  };
}

function mapMember(row: any) {
  return {
    id: row.userId,
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    type: row.type,
    departmentName: row.departmentName || "",
    designationName: row.designationName || "",
    addedAt: row.addedAt,
  };
}

function mapComment(row: any) {
  return {
    id: row.id,
    taskId: row.taskId,
    projectId: row.projectId,
    message: row.message,
    createdAt: row.createdAt,
    author: row.authorId
      ? {
          id: row.authorId,
          name: row.authorName,
          email: row.authorEmail,
        }
      : null,
  };
}

function mapActivity(row: any) {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    entityType: row.entityType,
    entityId: row.entityId,
    message: row.message,
    meta: row.meta || {},
    createdAt: row.createdAt,
    actor: row.actorId
      ? {
          id: row.actorId,
          name: row.actorName,
        }
      : null,
  };
}

export class ProjectServices {
  private repo = new ProjectRepository();

  private async requireProjectManager(currentUser: CurrentUser) {
    if (!isProjectManager(currentUser)) {
      throw Object.assign(
        new Error("Access denied. Admin or manager privileges required."),
        { statusCode: 403 },
      );
    }
  }

  private async requireProjectAccess(projectId: number, currentUser: CurrentUser) {
    const organizationId = getOrgId(currentUser);
    const project = await this.repo.getProjectById(projectId, organizationId);
    if (!project) {
      throw Object.assign(new Error("Project not found"), { statusCode: 404 });
    }

    if (!isProjectManager(currentUser)) {
      const membership = await this.repo.getMembership(projectId, currentUser.id);
      if (!membership) {
        throw Object.assign(new Error("You do not have access to this project"), {
          statusCode: 403,
        });
      }
    }

    return project;
  }

  private async ensureUsersBelongToOrganization(
    organizationId: number,
    userIds: number[],
    fieldLabel: string,
  ) {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (!uniqueIds.length) return [];
    const usersInOrg = await this.repo.findUsersInOrganization(uniqueIds, organizationId);
    if (usersInOrg.length !== uniqueIds.length) {
      throw Object.assign(new Error(`One or more ${fieldLabel} are invalid`), {
        statusCode: 400,
      });
    }
    return usersInOrg;
  }

  private buildProjectPayload(
    body: any,
    currentUser: CurrentUser,
    options: { partial?: boolean } = {},
  ) {
    const name = body.name === undefined ? undefined : String(body.name || "").trim();
    const description =
      body.description === undefined ? undefined : String(body.description || "").trim();
    const status =
      body.status === undefined ? undefined : normalizeStatus(body.status, "TODO");
    const priority =
      body.priority === undefined ? undefined : normalizePriority(body.priority, "MEDIUM");
    const ownerId =
      body.ownerId === undefined ? undefined : parseOptionalInt(body.ownerId, "ownerId");
    const progress =
      body.progress === undefined ? undefined : clampProgress(body.progress);
    const startDate =
      body.startDate === undefined
        ? undefined
        : parseOptionalDate(body.startDate, "start date");
    const dueDate =
      body.dueDate === undefined ? undefined : parseOptionalDate(body.dueDate, "due date");

    validateDateRange(startDate ?? null, dueDate ?? null);

    if (!options.partial) {
      if (!name) {
        throw Object.assign(new Error("Project name is required"), {
          statusCode: 400,
        });
      }
    }

    return {
      name,
      description,
      status,
      priority,
      ownerId,
      progress,
      startDate,
      dueDate,
      createdBy: currentUser.id,
    };
  }

  private buildTaskPayload(body: any, options: { partial?: boolean } = {}) {
    const title = body.title === undefined ? undefined : String(body.title || "").trim();
    const description =
      body.description === undefined ? undefined : String(body.description || "").trim();
    const status =
      body.status === undefined ? undefined : normalizeStatus(body.status, "TODO");
    const priority =
      body.priority === undefined ? undefined : normalizePriority(body.priority, "MEDIUM");
    const assigneeId =
      body.assigneeId === undefined
        ? undefined
        : parseOptionalInt(body.assigneeId, "assigneeId");
    const progress =
      body.progress === undefined ? undefined : clampProgress(body.progress);
    const startDate =
      body.startDate === undefined
        ? undefined
        : parseOptionalDate(body.startDate, "start date");
    const dueDate =
      body.dueDate === undefined ? undefined : parseOptionalDate(body.dueDate, "due date");

    validateDateRange(startDate ?? null, dueDate ?? null);

    if (!options.partial && !title) {
      throw Object.assign(new Error("Task title is required"), { statusCode: 400 });
    }

    return {
      title,
      description,
      status,
      priority,
      assigneeId,
      progress,
      startDate,
      dueDate,
    };
  }

  private async logProjectActivity(
    projectId: number,
    organizationId: number,
    actor: CurrentUser,
    type: string,
    message: string,
    entityType: string,
    entityId?: number | null,
    meta?: Record<string, unknown>,
  ) {
    await this.repo.logActivity({
      projectId,
      organizationId,
      actorId: actor.id,
      type,
      message,
      entityType,
      entityId: entityId ?? null,
      meta: meta || {},
    });
  }

  async list(currentUser: CurrentUser, query: any = {}) {
    await this.requireProjectManager(currentUser);
    const rows = await this.repo.listProjects(getOrgId(currentUser), {
      search: query.search || query.query || query.q,
      status: query.status,
      priority: query.priority,
    });
    return { success: true, data: page(rows.map(mapProject)) };
  }

  async myProjects(currentUser: CurrentUser, query: any = {}) {
    const rows = await this.repo.listProjects(
      getOrgId(currentUser),
      {
        search: query.search || query.query || query.q,
        status: query.status,
        priority: query.priority,
      },
      { memberUserId: currentUser.id },
    );
    return { success: true, data: page(rows.map(mapProject)) };
  }

  async get(projectId: number, currentUser: CurrentUser) {
    const row = await this.requireProjectAccess(projectId, currentUser);
    return { success: true, data: mapProject(row) };
  }

  async create(body: any, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const payload = this.buildProjectPayload(body, currentUser);
    const ownerId = payload.ownerId ?? currentUser.id;

    await this.ensureUsersBelongToOrganization(organizationId, [ownerId], "owner");

    const requestedMembers = Array.isArray(body.memberIds)
      ? body.memberIds.map((value: unknown) => parseOptionalInt(value, "memberId")).filter(Boolean)
      : [];
    const memberIds = Array.from(new Set([ownerId, ...requestedMembers])) as number[];
    await this.ensureUsersBelongToOrganization(organizationId, memberIds, "members");

    const project = await this.repo.createProject(
      {
        organizationId,
        name: payload.name!,
        description: payload.description || null,
        status: payload.status || "TODO",
        priority: payload.priority || "MEDIUM",
        ownerId,
        progress: payload.progress ?? 0,
        startDate: payload.startDate || null,
        dueDate: payload.dueDate || null,
        createdBy: currentUser.id,
      },
      memberIds,
    );

    await this.logProjectActivity(
      project.id,
      organizationId,
      currentUser,
      "PROJECT_CREATED",
      `${currentUser.name} created the project ${project.name}.`,
      "PROJECT",
      project.id,
      { memberIds },
    );

    const fullProject = await this.repo.getProjectById(project.id, organizationId);
    return { success: true, data: mapProject(fullProject) };
  }

  async update(projectId: number, body: any, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const current = await this.requireProjectAccess(projectId, currentUser);
    const payload = this.buildProjectPayload(body, currentUser, { partial: true });
    validateDateRange(
      payload.startDate !== undefined
        ? payload.startDate
        : (current.project.startDate ?? null),
      payload.dueDate !== undefined ? payload.dueDate : (current.project.dueDate ?? null),
    );
    const nextOwnerId = payload.ownerId ?? current.project.ownerId ?? null;

    if (nextOwnerId) {
      await this.ensureUsersBelongToOrganization(organizationId, [nextOwnerId], "owner");
    }

    const updated = await this.repo.updateProject(projectId, organizationId, {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.ownerId !== undefined ? { ownerId: payload.ownerId } : {}),
      ...(payload.progress !== undefined ? { progress: payload.progress } : {}),
      ...(payload.startDate !== undefined ? { startDate: payload.startDate } : {}),
      ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
    });

    if (!updated) {
      throw Object.assign(new Error("Project not found"), { statusCode: 404 });
    }

    if (
      payload.ownerId !== undefined &&
      payload.ownerId !== null &&
      payload.ownerId !== current.project.ownerId
    ) {
      await this.repo.syncProjectOwner(
        projectId,
        current.project.ownerId,
        payload.ownerId,
        currentUser.id,
      );
    }

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "PROJECT_UPDATED",
      `${currentUser.name} updated project details.`,
      "PROJECT",
      projectId,
    );

    const fullProject = await this.repo.getProjectById(projectId, organizationId);
    return { success: true, data: mapProject(fullProject) };
  }

  async archive(projectId: number, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const project = await this.repo.archiveProject(projectId, organizationId);
    if (!project) {
      throw Object.assign(new Error("Project not found"), { statusCode: 404 });
    }

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "PROJECT_ARCHIVED",
      `${currentUser.name} archived the project ${project.name}.`,
      "PROJECT",
      projectId,
    );

    return { success: true, message: "Project archived successfully" };
  }

  async members(projectId: number, currentUser: CurrentUser) {
    await this.requireProjectAccess(projectId, currentUser);
    const data = await this.repo.listMembers(projectId, getOrgId(currentUser));
    return { success: true, data: { items: data.map(mapMember) } };
  }

  async addMember(projectId: number, body: any, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const project = await this.requireProjectAccess(projectId, currentUser);
    const userId = parseOptionalInt(body.userId, "userId");

    if (!userId) {
      throw Object.assign(new Error("userId is required"), { statusCode: 400 });
    }

    const [memberUser] = await this.ensureUsersBelongToOrganization(
      organizationId,
      [userId],
      "member",
    );

    const existing = await this.repo.getMembership(projectId, userId);
    if (existing) {
      throw Object.assign(new Error("Member already exists in this project"), {
        statusCode: 409,
      });
    }

    await this.repo.addMember(
      projectId,
      userId,
      userId === project.project.ownerId ? "OWNER" : "MEMBER",
      currentUser.id,
    );

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "MEMBER_ADDED",
      `${currentUser.name} added ${memberUser.name} to the project.`,
      "MEMBER",
      userId,
    );

    return this.members(projectId, currentUser);
  }

  async removeMember(projectId: number, userId: number, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const project = await this.requireProjectAccess(projectId, currentUser);

    if (project.project.ownerId === userId) {
      throw Object.assign(new Error("Change the project owner before removing them"), {
        statusCode: 400,
      });
    }

    const [memberUser] = await this.ensureUsersBelongToOrganization(
      organizationId,
      [userId],
      "member",
    );

    const removed = await this.repo.removeMember(projectId, userId);
    if (!removed) {
      throw Object.assign(new Error("Member not found"), { statusCode: 404 });
    }

    await this.repo.unassignMemberTasks(projectId, userId);

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "MEMBER_REMOVED",
      `${currentUser.name} removed ${memberUser.name} from the project.`,
      "MEMBER",
      userId,
    );

    return { success: true, message: "Member removed successfully" };
  }

  async tasks(projectId: number, currentUser: CurrentUser, query: any = {}) {
    await this.requireProjectAccess(projectId, currentUser);
    const rows = await this.repo.listTasks(projectId, getOrgId(currentUser), {
      search: query.search || query.query || query.q,
      status: query.status,
      priority: query.priority,
      assigneeId: parseOptionalInt(query.assigneeId, "assigneeId") || undefined,
    });
    return { success: true, data: { items: rows.map(mapTask) } };
  }

  async allTasks(currentUser: CurrentUser, query: any = {}) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const projectId = parseOptionalInt(query.projectId, "projectId") || undefined;
    if (projectId) {
      await this.requireProjectAccess(projectId, currentUser);
    }
    const rows = await this.repo.listOrgTasks(organizationId, {
      search: query.search || query.query || query.q,
      status: query.status,
      priority: query.priority,
      projectId,
      assigneeId: parseOptionalInt(query.assigneeId, "assigneeId") || undefined,
    });
    return { success: true, data: { items: rows.map(mapTask) } };
  }

  async getTask(projectId: number, taskId: number, currentUser: CurrentUser) {
    await this.requireProjectAccess(projectId, currentUser);
    const row = await this.repo.getTaskById(taskId, projectId, getOrgId(currentUser));
    if (!row) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }
    return { success: true, data: mapTask(row) };
  }

  async createTask(projectId: number, body: any, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    await this.requireProjectAccess(projectId, currentUser);
    const payload = this.buildTaskPayload(body);

    if (payload.assigneeId) {
      await this.ensureUsersBelongToOrganization(
        organizationId,
        [payload.assigneeId],
        "assignee",
      );
      const membership = await this.repo.getMembership(projectId, payload.assigneeId);
      if (!membership) {
        throw Object.assign(new Error("Assignee must be a project member"), {
          statusCode: 400,
        });
      }
    }

    const task = await this.repo.createTask({
      projectId,
      organizationId,
      title: payload.title!,
      description: payload.description || null,
      status: payload.status || "TODO",
      priority: payload.priority || "MEDIUM",
      assigneeId: payload.assigneeId ?? null,
      createdBy: currentUser.id,
      startDate: payload.startDate || null,
      dueDate: payload.dueDate || null,
      progress:
        payload.progress ??
        (payload.status === "COMPLETED" ? 100 : 0),
    });

    await this.repo.recalculateProjectProgress(projectId, organizationId);

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "TASK_CREATED",
      `${currentUser.name} created the task ${task.title}.`,
      "TASK",
      task.id,
    );

    const row = await this.repo.getTaskById(task.id, projectId, organizationId);
    return { success: true, data: mapTask(row) };
  }

  async updateTask(
    projectId: number,
    taskId: number,
    body: any,
    currentUser: CurrentUser,
  ) {
    const organizationId = getOrgId(currentUser);
    await this.requireProjectAccess(projectId, currentUser);
    const existing = await this.repo.getTaskById(taskId, projectId, organizationId);
    if (!existing) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }

    const canManage = isProjectManager(currentUser);
    const payload = this.buildTaskPayload(body, { partial: true });
    validateDateRange(
      payload.startDate !== undefined
        ? payload.startDate
        : (existing.task.startDate ?? null),
      payload.dueDate !== undefined ? payload.dueDate : (existing.task.dueDate ?? null),
    );

    if (!canManage) {
      if (existing.task.assigneeId !== currentUser.id) {
        throw Object.assign(new Error("You can update only your own tasks"), {
          statusCode: 403,
        });
      }
      if (
        payload.assigneeId !== undefined ||
        payload.title !== undefined ||
        payload.description !== undefined ||
        payload.priority !== undefined ||
        payload.startDate !== undefined ||
        payload.dueDate !== undefined
      ) {
        throw Object.assign(
          new Error("Employees can update only task status and progress"),
          { statusCode: 403 },
        );
      }

      if (payload.status && payload.status !== existing.task.status) {
        const allowed = EMPLOYEE_STATUS_TRANSITIONS[existing.task.status] || [];
        if (!allowed.includes(payload.status)) {
          throw Object.assign(new Error("This task status transition is not allowed"), {
            statusCode: 400,
          });
        }
      }
    } else if (payload.assigneeId) {
      await this.ensureUsersBelongToOrganization(
        organizationId,
        [payload.assigneeId],
        "assignee",
      );
      const membership = await this.repo.getMembership(projectId, payload.assigneeId);
      if (!membership) {
        throw Object.assign(new Error("Assignee must be a project member"), {
          statusCode: 400,
        });
      }
    }

    let nextStatus = payload.status;
    let nextProgress = payload.progress;
    if (nextProgress === 100 && nextStatus === undefined) {
      nextStatus = "COMPLETED";
    }
    if (nextStatus === "COMPLETED" && nextProgress === undefined) {
      nextProgress = 100;
    }

    const updated = await this.repo.updateTask(taskId, projectId, organizationId, {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
      ...(payload.assigneeId !== undefined ? { assigneeId: payload.assigneeId } : {}),
      ...(payload.startDate !== undefined ? { startDate: payload.startDate } : {}),
      ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
      ...(nextProgress !== undefined ? { progress: nextProgress } : {}),
    });

    if (!updated) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }

    await this.repo.recalculateProjectProgress(projectId, organizationId);

    const activityType =
      nextStatus !== undefined && nextStatus !== existing.task.status
        ? "TASK_STATUS_CHANGED"
        : "TASK_UPDATED";
    const activityMessage =
      activityType === "TASK_STATUS_CHANGED"
        ? `${currentUser.name} moved ${existing.task.title} to ${nextStatus!.replaceAll("_", " ")}.`
        : `${currentUser.name} updated the task ${existing.task.title}.`;

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      activityType,
      activityMessage,
      "TASK",
      taskId,
    );

    const row = await this.repo.getTaskById(taskId, projectId, organizationId);
    return { success: true, data: mapTask(row) };
  }

  async archiveTask(projectId: number, taskId: number, currentUser: CurrentUser) {
    await this.requireProjectManager(currentUser);
    const organizationId = getOrgId(currentUser);
    const task = await this.repo.archiveTask(taskId, projectId, organizationId);
    if (!task) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }

    await this.repo.recalculateProjectProgress(projectId, organizationId);

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "TASK_ARCHIVED",
      `${currentUser.name} archived the task ${task.title}.`,
      "TASK",
      taskId,
    );

    return { success: true, message: "Task archived successfully" };
  }

  async activity(projectId: number, currentUser: CurrentUser) {
    await this.requireProjectAccess(projectId, currentUser);
    const rows = await this.repo.listActivity(projectId, getOrgId(currentUser));
    return { success: true, data: { items: rows.map(mapActivity) } };
  }

  async listTaskComments(projectId: number, taskId: number, currentUser: CurrentUser) {
    await this.requireProjectAccess(projectId, currentUser);
    const organizationId = getOrgId(currentUser);
    const task = await this.repo.getTaskById(taskId, projectId, organizationId);
    if (!task) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }
    const rows = await this.repo.listTaskComments(taskId, projectId, organizationId);
    return { success: true, data: { items: rows.map(mapComment) } };
  }

  async addTaskComment(
    projectId: number,
    taskId: number,
    body: any,
    currentUser: CurrentUser,
  ) {
    await this.requireProjectAccess(projectId, currentUser);
    const organizationId = getOrgId(currentUser);
    const task = await this.repo.getTaskById(taskId, projectId, organizationId);
    if (!task) {
      throw Object.assign(new Error("Task not found"), { statusCode: 404 });
    }

    const message = String(body.message || body.comment || "").trim();
    if (!message) {
      throw Object.assign(new Error("Comment cannot be empty"), { statusCode: 400 });
    }

    const comment = await this.repo.createTaskComment({
      taskId,
      projectId,
      organizationId,
      authorId: currentUser.id,
      message,
    });

    await this.logProjectActivity(
      projectId,
      organizationId,
      currentUser,
      "TASK_COMMENT_ADDED",
      `${currentUser.name} commented on ${task.task.title}.`,
      "TASK",
      taskId,
      { commentId: comment.id },
    );

    return {
      success: true,
      data: mapComment({
        id: comment.id,
        taskId: comment.taskId,
        projectId: comment.projectId,
        message: comment.message,
        createdAt: comment.createdAt,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
      }),
    };
  }

  async myTasks(currentUser: CurrentUser, query: any = {}) {
    const organizationId = getOrgId(currentUser);
    const rows = await this.repo.listUserTasks(currentUser.id, organizationId, {
      search: query.search || query.query || query.q,
      status: query.status,
      priority: query.priority,
      projectId: parseOptionalInt(query.projectId, "projectId") || undefined,
    });
    return { success: true, data: { items: rows.map(mapTask) } };
  }
}
