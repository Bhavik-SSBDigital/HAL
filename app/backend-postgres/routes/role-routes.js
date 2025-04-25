import express from "express";
import {
  add_role,
  get_roles,
  getRolesHierarchyInDepartment,
} from "../controller/role-controller.js";

const router = express.Router();

router.post("/addRole", add_role);
router.get("/getRoles", get_roles);
router.get(
  "/getRolesHierarchyInDepartment/:departmentId",
  getRolesHierarchyInDepartment
);

export default router;
