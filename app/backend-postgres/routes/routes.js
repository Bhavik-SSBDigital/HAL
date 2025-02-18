import express from "express";

import { sign_up, login, create_admin } from "../controller/auth-controller.js";

import {
  add_department,
  get_department,
  get_departments,
  getDepartmentsHierarchy,
} from "../controller/department-controller.js";

import {
  add_workflow,
  edit_workflow,
  view_workflow,
  delete_workflow,
  get_workflows,
} from "../controller/workflow-controller.js";

import {
  getDocumentDetailsOnTheBasisOfPath,
  create_permissions,
  getDocumentDetailsForAdmin,
  getDocumentDetailsOnTheBasisOfPathForEdit,
  getDocumentChildren,
} from "../controller/file-details-controller.js";

import {
  file_upload,
  file_download,
  create_folder,
  folder_download,
  file_copy,
  file_cut,
  file_delete,
  file_though_url,
  get_file_data,
} from "../controller/file-controller.js";

import {
  getRootDocumentsWithAccess,
  getRootDocumentsForEdit,
} from "../controller/project-controller.js";

import {
  add_role,
  get_roles,
  getRolesHierarchyInDepartment,
} from "../controller/role-controller.js";

import { get_users } from "../controller/user-controller.js";

const router = express.Router();

router.post("/signup", sign_up);
router.post("/login", login);

router.post("/createAdmin", create_admin);

router.post("/addDepartment", add_department);

// change POST to GET
router.get("/getDepartments", get_departments);

router.post("/getAllBranches", get_departments);

// all file related routes

router.post("/upload", file_upload);
router.post("/download", file_download);
router.post("/copyFile", file_copy);
router.post("/cutFile", file_cut);
router.post("/deleteFile", file_delete);
router.post("/createFolder", create_folder);
router.post("/downloadFolder", folder_download);
router.get("/files/:filePath(*)", file_though_url);
router.get("/getFileData", get_file_data);

// file details related routes

router.post("/accessFolder", getDocumentDetailsOnTheBasisOfPath);

router.get("/getDepartmentsHierarchy", getDepartmentsHierarchy);
router.post("/createPermissions", create_permissions);
router.post("/getAllDocuments", getDocumentDetailsForAdmin);
router.post(
  "/getDocumentDetailsOnTheBasisOfPathForEdit",
  getDocumentDetailsOnTheBasisOfPathForEdit
);
router.post("/getDocumentChildren", getDocumentChildren);

// project-controller related routes

router.post("/getProjects", getRootDocumentsWithAccess);
router.post("/getRootDocumentsForEdit", getRootDocumentsForEdit);

// role-controller related routes

router.post("/addRole", add_role);
router.get("/getRoles", get_roles);
router.get(
  "/getRolesHierarchyInDepartment/:departmentId",
  getRolesHierarchyInDepartment
);

// user-controller related routes
router.get("/getUsers", get_users);
router.post("/workflows/addWorkflow", add_workflow); // Create a new workflow
router.put("/workflows/editWorkflow/:workflowId", edit_workflow); // Edit workflow (new version)
router.get("/workflows/viewWorkflow/:workflowId", view_workflow); // View workflow details
router.delete("/workflows/deleteWorkflow/:workflowId", delete_workflow); // Delete workflow
router.get("/workflows/getWorkflows", get_workflows); // Get all workflows

export default router;
