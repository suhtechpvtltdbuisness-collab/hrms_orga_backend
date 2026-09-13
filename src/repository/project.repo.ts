import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/connection.js";
import {
  department,
  designation,
  employment,
  projectManagementActivity,
  projectManagementMember,
  projectManagementProject,
  projectManagementTask,
  projectManagementTaskComment,
  users,
} from "../db/schema.js";

export type ProjectListFilters = {
  search?: string;
  status?: string;
  priority?: string;
};

export type ProjectTaskFilters = {
  search?: string;
  status?: string;
  priority?: string;
  assigneeId?: number;
  projectId?: number;
};

const ownerUser = alias(users, "project_owner");
const assigneeUser = alias(users, "task_assignee");
const activityActor = alias(users, "project_activity_actor");
const commentAuthor = alias(users, "task_comment_author");

export class ProjectRepository {
  async findUserInOrganization(userId: number, organizationId: number) {
    const [row] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        type: users.type,
        isAdmin: users.isAdmin,
        active: users.active,
      })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.organizationId, organizationId),
          eq(users.isDeleted, false),
          eq(users.active, true),
        ),
      )
      .limit(1);
    return row || null;
  }

  async findUsersInOrganization(userIds: number[], organizationId: number) {
    if (!userIds.length) return [];
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        type: users.type,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(
        and(
          inArray(users.id, userIds),
          eq(users.organizationId, organizationId),
          eq(users.isDeleted, false),
          eq(users.active, true),
        ),
      );
  }

  async listProjects(
    organizationId: number,
    filters: ProjectListFilters = {},
    options: { memberUserId?: number } = {},
  ) {
    const conditions = [
      eq(projectManagementProject.organizationId, organizationId),
      eq(projectManagementProject.isArchived, false),
    ];

    if (filters.status) {
      conditions.push(eq(projectManagementProject.status, filters.status as any));
    }
    if (filters.priority) {
      conditions.push(eq(projectManagementProject.priority, filters.priority as any));
    }
    if (filters.search?.trim()) {
      const query = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(projectManagementProject.name, query),
          ilike(projectManagementProject.description, query),
        )!,
      );
    }
    if (options.memberUserId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM "project_management_member" pm
          WHERE pm."project_id" = ${projectManagementProject.id}
            AND pm."user_id" = ${options.memberUserId}
        )`,
      );
    }

    const rows = await db
      .select({
        project: projectManagementProject,
        ownerId: ownerUser.id,
        ownerName: ownerUser.name,
        ownerEmail: ownerUser.email,
        memberCount: sql<number>`(
          SELECT count(*)::int
          FROM "project_management_member" pm
          WHERE pm."project_id" = ${projectManagementProject.id}
        )`.as("member_count"),
        taskCount: sql<number>`(
          SELECT count(*)::int
          FROM "project_management_task" pt
          WHERE pt."project_id" = ${projectManagementProject.id}
            AND pt."is_archived" = false
        )`.as("task_count"),
        completedTaskCount: sql<number>`(
          SELECT count(*)::int
          FROM "project_management_task" pt
          WHERE pt."project_id" = ${projectManagementProject.id}
            AND pt."is_archived" = false
            AND pt."status" = 'COMPLETED'
        )`.as("completed_task_count"),
      })
      .from(projectManagementProject)
      .leftJoin(ownerUser, eq(ownerUser.id, projectManagementProject.ownerId))
      .where(and(...conditions))
      .orderBy(desc(projectManagementProject.updatedAt), desc(projectManagementProject.id));

    return rows;
  }

  async getProjectById(
    id: number,
    organizationId: number,
    options: { memberUserId?: number } = {},
  ) {
    const conditions = [
      eq(projectManagementProject.id, id),
      eq(projectManagementProject.organizationId, organizationId),
      eq(projectManagementProject.isArchived, false),
    ];

    if (options.memberUserId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM "project_management_member" pm
          WHERE pm."project_id" = ${projectManagementProject.id}
            AND pm."user_id" = ${options.memberUserId}
        )`,
      );
    }

    const [row] = await db
      .select({
        project: projectManagementProject,
        ownerId: ownerUser.id,
        ownerName: ownerUser.name,
        ownerEmail: ownerUser.email,
        memberCount: sql<number>`(
          SELECT count(*)::int
          FROM "project_management_member" pm
          WHERE pm."project_id" = ${projectManagementProject.id}
        )`.as("member_count"),
        taskCount: sql<number>`(
          SELECT count(*)::int
          FROM "project_management_task" pt
          WHERE pt."project_id" = ${projectManagementProject.id}
            AND pt."is_archived" = false
        )`.as("task_count"),
        completedTaskCount: sql<number>`(
          SELECT count(*)::int
          FROM "project_management_task" pt
          WHERE pt."project_id" = ${projectManagementProject.id}
            AND pt."is_archived" = false
            AND pt."status" = 'COMPLETED'
        )`.as("completed_task_count"),
      })
      .from(projectManagementProject)
      .leftJoin(ownerUser, eq(ownerUser.id, projectManagementProject.ownerId))
      .where(and(...conditions))
      .limit(1);

    return row || null;
  }

  async getMembership(projectId: number, userId: number) {
    const [row] = await db
      .select()
      .from(projectManagementMember)
      .where(
        and(
          eq(projectManagementMember.projectId, projectId),
          eq(projectManagementMember.userId, userId),
        ),
      )
      .limit(1);
    return row || null;
  }

  async listMembers(projectId: number, organizationId: number) {
    return db
      .select({
        membershipId: projectManagementMember.id,
        projectId: projectManagementMember.projectId,
        role: projectManagementMember.role,
        addedAt: projectManagementMember.createdAt,
        addedBy: projectManagementMember.addedBy,
        userId: users.id,
        name: users.name,
        email: users.email,
        type: users.type,
        departmentName: department.departmentName,
        designationName: designation.name,
      })
      .from(projectManagementMember)
      .innerJoin(
        projectManagementProject,
        and(
          eq(projectManagementProject.id, projectManagementMember.projectId),
          eq(projectManagementProject.organizationId, organizationId),
        ),
      )
      .innerJoin(
        users,
        and(
          eq(users.id, projectManagementMember.userId),
          eq(users.isDeleted, false),
          eq(users.active, true),
        ),
      )
      .leftJoin(
        employment,
        and(eq(employment.employeeId, users.id), eq(employment.isDeleted, false)),
      )
      .leftJoin(
        department,
        and(eq(department.id, employment.departmentId), eq(department.isDeleted, false)),
      )
      .leftJoin(
        designation,
        and(
          eq(designation.id, employment.designationId),
          eq(designation.isDeleted, false),
        ),
      )
      .where(eq(projectManagementMember.projectId, projectId))
      .orderBy(asc(projectManagementMember.createdAt), asc(users.name));
  }

  async listTasks(projectId: number, organizationId: number, filters: ProjectTaskFilters = {}) {
    const conditions = [
      eq(projectManagementTask.projectId, projectId),
      eq(projectManagementTask.organizationId, organizationId),
      eq(projectManagementTask.isArchived, false),
      eq(projectManagementProject.isArchived, false),
    ];

    if (filters.status) {
      conditions.push(eq(projectManagementTask.status, filters.status as any));
    }
    if (filters.priority) {
      conditions.push(eq(projectManagementTask.priority, filters.priority as any));
    }
    if (filters.assigneeId) {
      conditions.push(eq(projectManagementTask.assigneeId, filters.assigneeId));
    }
    if (filters.search?.trim()) {
      const query = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(projectManagementTask.title, query),
          ilike(projectManagementTask.description, query),
        )!,
      );
    }

    return db
      .select({
        task: projectManagementTask,
        projectName: projectManagementProject.name,
        assigneeId: assigneeUser.id,
        assigneeName: assigneeUser.name,
        assigneeEmail: assigneeUser.email,
      })
      .from(projectManagementTask)
      .innerJoin(
        projectManagementProject,
        and(
          eq(projectManagementProject.id, projectManagementTask.projectId),
          eq(projectManagementProject.organizationId, organizationId),
        ),
      )
      .leftJoin(
        assigneeUser,
        and(
          eq(assigneeUser.id, projectManagementTask.assigneeId),
          eq(assigneeUser.isDeleted, false),
        ),
      )
      .where(and(...conditions))
      .orderBy(
        asc(projectManagementTask.status),
        asc(projectManagementTask.dueDate),
        desc(projectManagementTask.updatedAt),
      );
  }

  async listOrgTasks(
    organizationId: number,
    filters: ProjectTaskFilters = {},
    options: { memberUserId?: number } = {},
  ) {
    const conditions = [
      eq(projectManagementTask.organizationId, organizationId),
      eq(projectManagementTask.isArchived, false),
      eq(projectManagementProject.isArchived, false),
    ];

    if (filters.projectId) {
      conditions.push(eq(projectManagementTask.projectId, filters.projectId));
    }
    if (filters.status) {
      conditions.push(eq(projectManagementTask.status, filters.status as any));
    }
    if (filters.priority) {
      conditions.push(eq(projectManagementTask.priority, filters.priority as any));
    }
    if (filters.assigneeId) {
      conditions.push(eq(projectManagementTask.assigneeId, filters.assigneeId));
    }
    if (filters.search?.trim()) {
      const query = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(projectManagementTask.title, query),
          ilike(projectManagementTask.description, query),
          ilike(projectManagementProject.name, query),
        )!,
      );
    }
    if (options.memberUserId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM "project_management_member" pm
          WHERE pm."project_id" = ${projectManagementTask.projectId}
            AND pm."user_id" = ${options.memberUserId}
        )`,
      );
    }

    return db
      .select({
        task: projectManagementTask,
        projectName: projectManagementProject.name,
        assigneeId: assigneeUser.id,
        assigneeName: assigneeUser.name,
        assigneeEmail: assigneeUser.email,
      })
      .from(projectManagementTask)
      .innerJoin(
        projectManagementProject,
        and(
          eq(projectManagementProject.id, projectManagementTask.projectId),
          eq(projectManagementProject.organizationId, organizationId),
          eq(projectManagementProject.isArchived, false),
        ),
      )
      .leftJoin(
        assigneeUser,
        and(
          eq(assigneeUser.id, projectManagementTask.assigneeId),
          eq(assigneeUser.isDeleted, false),
        ),
      )
      .where(and(...conditions))
      .orderBy(
        asc(projectManagementTask.status),
        asc(projectManagementTask.dueDate),
        desc(projectManagementTask.updatedAt),
      );
  }

  async getTaskById(taskId: number, projectId: number, organizationId: number) {
    const [row] = await db
      .select({
        task: projectManagementTask,
        projectName: projectManagementProject.name,
        assigneeId: assigneeUser.id,
        assigneeName: assigneeUser.name,
        assigneeEmail: assigneeUser.email,
      })
      .from(projectManagementTask)
      .innerJoin(
        projectManagementProject,
        and(
          eq(projectManagementProject.id, projectManagementTask.projectId),
          eq(projectManagementProject.organizationId, organizationId),
          eq(projectManagementProject.isArchived, false),
        ),
      )
      .leftJoin(
        assigneeUser,
        and(
          eq(assigneeUser.id, projectManagementTask.assigneeId),
          eq(assigneeUser.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(projectManagementTask.id, taskId),
          eq(projectManagementTask.projectId, projectId),
          eq(projectManagementTask.organizationId, organizationId),
          eq(projectManagementTask.isArchived, false),
        ),
      )
      .limit(1);
    return row || null;
  }

  async listUserTasks(userId: number, organizationId: number, filters: ProjectTaskFilters = {}) {
    const conditions = [
      eq(projectManagementTask.assigneeId, userId),
      eq(projectManagementTask.organizationId, organizationId),
      eq(projectManagementTask.isArchived, false),
      eq(projectManagementProject.isArchived, false),
    ];

    if (filters.status) {
      conditions.push(eq(projectManagementTask.status, filters.status as any));
    }
    if (filters.priority) {
      conditions.push(eq(projectManagementTask.priority, filters.priority as any));
    }
    if (filters.projectId) {
      conditions.push(eq(projectManagementTask.projectId, filters.projectId));
    }
    if (filters.search?.trim()) {
      const query = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(projectManagementTask.title, query),
          ilike(projectManagementTask.description, query),
          ilike(projectManagementProject.name, query),
        )!,
      );
    }

    return db
      .select({
        task: projectManagementTask,
        projectName: projectManagementProject.name,
        assigneeId: assigneeUser.id,
        assigneeName: assigneeUser.name,
        assigneeEmail: assigneeUser.email,
      })
      .from(projectManagementTask)
      .innerJoin(
        projectManagementProject,
        and(
          eq(projectManagementProject.id, projectManagementTask.projectId),
          eq(projectManagementProject.organizationId, organizationId),
          eq(projectManagementProject.isArchived, false),
        ),
      )
      .leftJoin(
        assigneeUser,
        and(
          eq(assigneeUser.id, projectManagementTask.assigneeId),
          eq(assigneeUser.isDeleted, false),
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(projectManagementTask.dueDate), desc(projectManagementTask.updatedAt));
  }

  async listActivity(projectId: number, organizationId: number) {
    return db
      .select({
        id: projectManagementActivity.id,
        projectId: projectManagementActivity.projectId,
        actorId: activityActor.id,
        actorName: activityActor.name,
        type: projectManagementActivity.type,
        entityType: projectManagementActivity.entityType,
        entityId: projectManagementActivity.entityId,
        message: projectManagementActivity.message,
        meta: projectManagementActivity.meta,
        createdAt: projectManagementActivity.createdAt,
      })
      .from(projectManagementActivity)
      .leftJoin(
        activityActor,
        and(
          eq(activityActor.id, projectManagementActivity.actorId),
          eq(activityActor.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(projectManagementActivity.projectId, projectId),
          eq(projectManagementActivity.organizationId, organizationId),
        ),
      )
      .orderBy(desc(projectManagementActivity.createdAt), desc(projectManagementActivity.id));
  }

  async createProject(data: typeof projectManagementProject.$inferInsert, memberIds: number[]) {
    return db.transaction(async (tx) => {
      const [project] = await tx.insert(projectManagementProject).values(data).returning();

      if (memberIds.length) {
        await tx.insert(projectManagementMember).values(
          memberIds.map((userId) => ({
            projectId: project.id,
            userId,
            role: userId === data.ownerId ? "OWNER" : "MEMBER",
            addedBy: data.createdBy ?? null,
          })),
        );
      }

      return project;
    });
  }

  async updateProject(
    id: number,
    organizationId: number,
    data: Partial<typeof projectManagementProject.$inferInsert>,
  ) {
    const [project] = await db
      .update(projectManagementProject)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(projectManagementProject.id, id),
          eq(projectManagementProject.organizationId, organizationId),
          eq(projectManagementProject.isArchived, false),
        ),
      )
      .returning();
    return project || null;
  }

  async syncProjectOwner(
    projectId: number,
    previousOwnerId: number | null,
    nextOwnerId: number,
    actorId: number,
  ) {
    return db.transaction(async (tx) => {
      if (previousOwnerId) {
        await tx
          .update(projectManagementMember)
          .set({ role: "MEMBER" })
          .where(
            and(
              eq(projectManagementMember.projectId, projectId),
              eq(projectManagementMember.userId, previousOwnerId),
            ),
          );
      }

      const [membership] = await tx
        .select()
        .from(projectManagementMember)
        .where(
          and(
            eq(projectManagementMember.projectId, projectId),
            eq(projectManagementMember.userId, nextOwnerId),
          ),
        )
        .limit(1);

      if (membership) {
        await tx
          .update(projectManagementMember)
          .set({ role: "OWNER" })
          .where(eq(projectManagementMember.id, membership.id));
      } else {
        await tx.insert(projectManagementMember).values({
          projectId,
          userId: nextOwnerId,
          role: "OWNER",
          addedBy: actorId,
        });
      }
    });
  }

  async archiveProject(id: number, organizationId: number) {
    const [project] = await db
      .update(projectManagementProject)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(
        and(
          eq(projectManagementProject.id, id),
          eq(projectManagementProject.organizationId, organizationId),
          eq(projectManagementProject.isArchived, false),
        ),
      )
      .returning();
    return project || null;
  }

  async addMember(projectId: number, userId: number, role: string, addedBy: number) {
    const [membership] = await db
      .insert(projectManagementMember)
      .values({ projectId, userId, role, addedBy })
      .returning();
    return membership;
  }

  async removeMember(projectId: number, userId: number) {
    const [membership] = await db
      .delete(projectManagementMember)
      .where(
        and(
          eq(projectManagementMember.projectId, projectId),
          eq(projectManagementMember.userId, userId),
        ),
      )
      .returning();
    return membership || null;
  }

  async unassignMemberTasks(projectId: number, userId: number) {
    await db
      .update(projectManagementTask)
      .set({ assigneeId: null, updatedAt: new Date() })
      .where(
        and(
          eq(projectManagementTask.projectId, projectId),
          eq(projectManagementTask.assigneeId, userId),
          eq(projectManagementTask.isArchived, false),
        ),
      );
  }

  async createTask(data: typeof projectManagementTask.$inferInsert) {
    const [task] = await db.insert(projectManagementTask).values(data).returning();
    return task;
  }

  async updateTask(
    taskId: number,
    projectId: number,
    organizationId: number,
    data: Partial<typeof projectManagementTask.$inferInsert>,
  ) {
    const [task] = await db
      .update(projectManagementTask)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(projectManagementTask.id, taskId),
          eq(projectManagementTask.projectId, projectId),
          eq(projectManagementTask.organizationId, organizationId),
          eq(projectManagementTask.isArchived, false),
        ),
      )
      .returning();
    return task || null;
  }

  async archiveTask(taskId: number, projectId: number, organizationId: number) {
    const [task] = await db
      .update(projectManagementTask)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(
        and(
          eq(projectManagementTask.id, taskId),
          eq(projectManagementTask.projectId, projectId),
          eq(projectManagementTask.organizationId, organizationId),
          eq(projectManagementTask.isArchived, false),
        ),
      )
      .returning();
    return task || null;
  }

  async logActivity(data: typeof projectManagementActivity.$inferInsert) {
    const [entry] = await db.insert(projectManagementActivity).values(data).returning();
    return entry;
  }

  async listTaskComments(taskId: number, projectId: number, organizationId: number) {
    return db
      .select({
        id: projectManagementTaskComment.id,
        taskId: projectManagementTaskComment.taskId,
        projectId: projectManagementTaskComment.projectId,
        message: projectManagementTaskComment.message,
        createdAt: projectManagementTaskComment.createdAt,
        authorId: commentAuthor.id,
        authorName: commentAuthor.name,
        authorEmail: commentAuthor.email,
      })
      .from(projectManagementTaskComment)
      .leftJoin(
        commentAuthor,
        and(
          eq(commentAuthor.id, projectManagementTaskComment.authorId),
          eq(commentAuthor.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(projectManagementTaskComment.taskId, taskId),
          eq(projectManagementTaskComment.projectId, projectId),
          eq(projectManagementTaskComment.organizationId, organizationId),
        ),
      )
      .orderBy(asc(projectManagementTaskComment.createdAt), asc(projectManagementTaskComment.id));
  }

  async createTaskComment(data: typeof projectManagementTaskComment.$inferInsert) {
    const [comment] = await db.insert(projectManagementTaskComment).values(data).returning();
    return comment;
  }

  async recalculateProjectProgress(projectId: number, organizationId: number) {
    const [stats] = await db
      .select({
        avgProgress: sql<number>`COALESCE(ROUND(AVG(${projectManagementTask.progress}))::int, 0)`,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${projectManagementTask.status} = 'COMPLETED')::int`,
      })
      .from(projectManagementTask)
      .where(
        and(
          eq(projectManagementTask.projectId, projectId),
          eq(projectManagementTask.organizationId, organizationId),
          eq(projectManagementTask.isArchived, false),
        ),
      );

    const [currentProject] = await db
      .select({
        id: projectManagementProject.id,
        status: projectManagementProject.status,
      })
      .from(projectManagementProject)
      .where(
        and(
          eq(projectManagementProject.id, projectId),
          eq(projectManagementProject.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!currentProject) return null;

    const total = Number(stats?.total || 0);
    const completed = Number(stats?.completed || 0);
    const avgProgress = Number(stats?.avgProgress || 0);
    let nextStatus = currentProject.status;

    if (total === 0) {
      nextStatus = currentProject.status;
    } else if (completed === total) {
      nextStatus = "COMPLETED";
    } else if (avgProgress > 0 && currentProject.status === "TODO") {
      nextStatus = "IN_PROGRESS";
    } else if (avgProgress === 0 && completed === 0) {
      nextStatus = "TODO";
    }

    const [project] = await db
      .update(projectManagementProject)
      .set({
        progress: avgProgress,
        status: nextStatus as any,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectManagementProject.id, projectId),
          eq(projectManagementProject.organizationId, organizationId),
        ),
      )
      .returning();

    return project || null;
  }
}
