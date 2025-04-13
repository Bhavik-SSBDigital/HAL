import express from "express";

import upload_ from "../config/multer-config.js";

import {
  sign_up,
  login,
  create_admin,
  change_password,
} from "../controller/auth-controller.js";

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
  sign_document,
  revoke_sign,
  reject_document,
  revoke_rejection,
} from "../controller/e-sign-controller.js";

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
  get_role,
  edit_role,
  get_roles,
  getRolesHierarchyInDepartment,
} from "../controller/role-controller.js";

import {
  edit_user,
  get_user,
  get_user_profile_data,
  get_user_profile_pic,
  get_user_signature,
  get_users,
  get_users_with_details,
} from "../controller/user-controller.js";
import {
  complete_process_step,
  get_user_processes,
  initiate_process,
  view_process,
} from "../controller/process-controller.js";
import { pick_process_step } from "../controller/process-step-claim.js";

import { upload_signature } from "../controller/image-controller.js";

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

router.get("/getRole/:id", get_role);
router.put("/editRole/:id", edit_role);
router.get(
  "/getRolesHierarchyInDepartment/:departmentId",
  getRolesHierarchyInDepartment
);

// user-controller related routes
router.get("/getUsers", get_users);
router.get("/getUser/:userId", get_user);
router.put("/editUser/:userId", edit_user);
router.post("/workflows/addWorkflow", add_workflow); // Create a new workflow
router.put("/workflows/editWorkflow/:workflowId", edit_workflow); // Edit workflow (new version)
router.get("/workflows/viewWorkflow/:workflowId", view_workflow); // View workflow details
router.delete("/workflows/deleteWorkflow/:workflowId", delete_workflow); // Delete workflow
router.get("/workflows/getWorkflows", get_workflows); // Get all workflows

router.post("/initiateProcess", initiate_process);

router.get("/viewProcess/:processId", view_process);

router.post("/claimProcessStep", pick_process_step);

router.post("/completeStep", complete_process_step);

router.get("/getUsersWithDetails", get_users_with_details);

router.get("/getUserProcesses", get_user_processes);

router.post("/changePassword", change_password);

router.post("/signDocument", sign_document);
router.post("/revokeSign", revoke_sign);
router.post("/rejectDocument", reject_document);
router.post("/revokeRejection", revoke_rejection);

router.get("/getUserSignature", get_user_signature);
router.get("/getUserProfilePic", get_user_profile_pic);

router.get("/getUserProfileData", get_user_profile_data);

router.get("/getUserSignature", get_user_signature);
router.get("/getUserProfilePic", get_user_profile_pic);

router.post(
  "/uploadSignature",
  // uploadDummy.any(),
  // set_purpose,
  upload_.single("file"),
  upload_signature
);

export default router;
