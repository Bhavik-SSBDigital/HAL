import express from "express";
import {
  add_workflow,
  edit_workflow,
  view_workflow,
  delete_workflow,
} from "../controllers/workflow-controller.js";

const router = express.Router();

// Define workflow-related routes
router.post("/addWorkflow", add_workflow); // Create a new workflow
router.put("/editWorkflow/:workflowId", edit_workflow); // Edit workflow (new version)
router.get("/viewWorkflow/:workflowId", view_workflow); // View workflow details
router.delete("/deleteWorkflow/:workflowId", delete_workflow); // Delete workflow

export default router;
