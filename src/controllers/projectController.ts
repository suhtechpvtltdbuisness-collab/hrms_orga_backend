import { NextFunction, Request, Response } from "express";
import { ProjectServices } from "../services/projectServices.js";

const service = new ProjectServices();

const run =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      const status = error?.statusCode || 400;
      res.status(status).json({
        success: false,
        message: error?.message || "Project request failed",
      });
    }
  };

const readId = (value: string, label: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`Invalid ${label} ID`), { statusCode: 400 });
  }
  return parsed;
};

const readParam = (value: string | string[] | undefined, label: string) => {
  if (Array.isArray(value)) return readId(value[0], label);
  return readId(String(value || ""), label);
};

export const listProjects = run(async (req, res) => {
  res.json(await service.list(res.locals.user, req.query));
});

export const listMyProjects = run(async (req, res) => {
  res.json(await service.myProjects(res.locals.user, req.query));
});

export const getProject = run(async (req, res) => {
  res.json(await service.get(readParam(req.params.projectId, "project"), res.locals.user));
});

export const createProject = run(async (req, res) => {
  res.status(201).json(await service.create(req.body, res.locals.user));
});

export const updateProject = run(async (req, res) => {
  res.json(
    await service.update(readParam(req.params.projectId, "project"), req.body, res.locals.user),
  );
});

export const archiveProject = run(async (req, res) => {
  res.json(await service.archive(readParam(req.params.projectId, "project"), res.locals.user));
});

export const listProjectMembers = run(async (req, res) => {
  res.json(await service.members(readParam(req.params.projectId, "project"), res.locals.user));
});

export const addProjectMember = run(async (req, res) => {
  res.status(201).json(
    await service.addMember(readParam(req.params.projectId, "project"), req.body, res.locals.user),
  );
});

export const removeProjectMember = run(async (req, res) => {
  res.json(
    await service.removeMember(
      readParam(req.params.projectId, "project"),
      readParam(req.params.userId, "user"),
      res.locals.user,
    ),
  );
});

export const listProjectTasks = run(async (req, res) => {
  res.json(
    await service.tasks(readParam(req.params.projectId, "project"), res.locals.user, req.query),
  );
});

export const listAllTasks = run(async (req, res) => {
  res.json(await service.allTasks(res.locals.user, req.query));
});

export const getProjectTask = run(async (req, res) => {
  res.json(
    await service.getTask(
      readParam(req.params.projectId, "project"),
      readParam(req.params.taskId, "task"),
      res.locals.user,
    ),
  );
});

export const createProjectTask = run(async (req, res) => {
  res.status(201).json(
    await service.createTask(readParam(req.params.projectId, "project"), req.body, res.locals.user),
  );
});

export const updateProjectTask = run(async (req, res) => {
  res.json(
    await service.updateTask(
      readParam(req.params.projectId, "project"),
      readParam(req.params.taskId, "task"),
      req.body,
      res.locals.user,
    ),
  );
});

export const archiveProjectTask = run(async (req, res) => {
  res.json(
    await service.archiveTask(
      readParam(req.params.projectId, "project"),
      readParam(req.params.taskId, "task"),
      res.locals.user,
    ),
  );
});

export const listProjectTaskComments = run(async (req, res) => {
  res.json(
    await service.listTaskComments(
      readParam(req.params.projectId, "project"),
      readParam(req.params.taskId, "task"),
      res.locals.user,
    ),
  );
});

export const createProjectTaskComment = run(async (req, res) => {
  res.status(201).json(
    await service.addTaskComment(
      readParam(req.params.projectId, "project"),
      readParam(req.params.taskId, "task"),
      req.body,
      res.locals.user,
    ),
  );
});

export const listProjectActivity = run(async (req, res) => {
  res.json(await service.activity(readParam(req.params.projectId, "project"), res.locals.user));
});

export const listMyTasks = run(async (req, res) => {
  res.json(await service.myTasks(res.locals.user, req.query));
});
