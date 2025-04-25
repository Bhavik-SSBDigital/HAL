import express from "express";
import {
  add_department,
  get_department,
  get_departments,
  getDepartmentsHierarchy,
} from "../controller/department-controller.js";

const router = express.Router();

router.post("/addDepartment", add_department);
router.get("/getDepartments", get_departments);
router.get("/getDepartmentsHierarchy", getDepartmentsHierarchy);

export default router;
