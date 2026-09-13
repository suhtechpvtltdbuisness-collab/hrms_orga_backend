import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  addProjectMember,
  archiveProject,
  archiveProjectTask,
  createProject,
  createProjectTask,
  createProjectTaskComment,
  getProject,
  getProjectTask,
  listMyProjects,
  listMyTasks,
  listProjectActivity,
  listProjectMembers,
  listProjects,
  listProjectTasks,
  listProjectTaskComments,
  listAllTasks,
  removeProjectMember,
  updateProject,
  updateProjectTask,
} from "../controllers/projectController.js";

const router = Router();

router.get("/tasks/mine", authenticate, listMyTasks);
router.get("/tasks", authenticate, listAllTasks);
router.get("/mine", authenticate, listMyProjects);
router.get("/", authenticate, listProjects);
router.post("/", authenticate, createProject);
router.get("/:projectId", authenticate, getProject);
router.patch("/:projectId", authenticate, updateProject);
router.delete("/:projectId", authenticate, archiveProject);
router.get("/:projectId/members", authenticate, listProjectMembers);
router.post("/:projectId/members", authenticate, addProjectMember);
router.delete("/:projectId/members/:userId", authenticate, removeProjectMember);
router.get("/:projectId/tasks", authenticate, listProjectTasks);
router.post("/:projectId/tasks", authenticate, createProjectTask);
router.get("/:projectId/tasks/:taskId", authenticate, getProjectTask);
router.patch("/:projectId/tasks/:taskId", authenticate, updateProjectTask);
router.delete("/:projectId/tasks/:taskId", authenticate, archiveProjectTask);
router.get("/:projectId/tasks/:taskId/comments", authenticate, listProjectTaskComments);
router.post("/:projectId/tasks/:taskId/comments", authenticate, createProjectTaskComment);
router.get("/:projectId/activity", authenticate, listProjectActivity);

export default router;
