import { Router } from "express";
import { submitDemoRequest } from "../controllers/contactController.js";

const contactRouter = Router();

contactRouter.post("/demo-request", submitDemoRequest);

export default contactRouter;
