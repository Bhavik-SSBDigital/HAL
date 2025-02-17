import express from "express";
import {
  getRootDocumentsWithAccess,
  getRootDocumentsForEdit,
} from "../controller/project-controller.js";

const router = express.Router();

router.post("/getProjects", getRootDocumentsWithAccess);
router.post("/getRootDocumentsForEdit", getRootDocumentsForEdit);

export default router;
