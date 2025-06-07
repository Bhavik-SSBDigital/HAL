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

// import {
//   createQuery,
//   getProcessQueries,
//   respondToQuery,
//   approveQueryDocument,
//   approveRecirculation,
//   createQueryDoubt,
//   respondToQueryDoubt,
// } from "../controller/query-controller.js";

// import {
//   requestRecommendation,
//   submitRecommendation,
//   getRecommendations,
//   getRecommendationDetails,
//   requestRecommendationClarification,
//   respondToRecommendationClarification,
//   createRecommendationDoubt,
//   respondToRecommendationDoubt,
// } from "../controller/recommendation-controller.js";

// import {
//   postHighlight,
//   getHighlights,
// } from "../controller/highlight-controller.js";

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
  delete_file,
  recover_from_recycle_bin,
  archive_file,
  unarchive_file,
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
  get_user_dsc,
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
  createQuery,
  createRecommendation,
  submitRecommendationResponse,
  get_recommendation,
  get_recommendations,
  signAsRecommender,
} from "../controller/process-controller.js";
import { pick_process_step } from "../controller/process-step-claim.js";

import { upload_signature } from "../controller/image-controller.js";
import {
  get_user_activity_logs,
  get_user_activity_log,
  get_process_activity_logs,
} from "../controller/log-controller.js";

import {
  getNumbers,
  getDetails,
  getWorkflowAnalysis,
} from "../controller/dashboard-controller.js";

const router = express.Router();

router.post("/signup", sign_up);
router.post("/login", login);

// backend/routes/auth.js

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
router.post("/getUserProfilePic", get_user_profile_pic);

router.get("/getUserProfileData", get_user_profile_data);

router.get("/getUserSignature", get_user_signature);
router.get("/getUserProfilePic", get_user_profile_pic);
router.get("/getUserDSC", get_user_dsc);

router.post(
  "/uploadSignature",
  // uploadDummy.any(),
  // set_purpose,
  upload_.single("file"),
  upload_signature
);

router.post("/queries/createQuery", createQuery);

router.post("/recommendations/createRecommendation", createRecommendation);
router.post("/recommendations/signDocument", signAsRecommender);
router.post("/recommendations/respond", submitRecommendationResponse);
router.get("/recommendations/getRecommendations", get_recommendations);
router.get("/recommendations/:recommendationId", get_recommendation);
// router.get("/queries/process/:processId", getProcessQueries);
// router.post("/queries/respond/:queryId", respondToQuery);
// router.post("/queries/documents/approve/:documentId", approveQueryDocument);
// router.post("/queries/approve-recirculation/:queryId", approveRecirculation);
// router.post("/queries/doubts/:queryId", createQueryDoubt);
// router.post("/doubts/respond/:doubtId", respondToQueryDoubt);

// // Recommendation routes
// router.post("/recommendations", requestRecommendation);
// router.post("/recommendations/submit/:recommendationId", submitRecommendation);
// router.get("/recommendations", getRecommendations);
// router.get("/recommendations/:id", getRecommendationDetails);
// router.post(
//   "/recommendations/request-clarification/:recommendationId",
//   createRecommendationDoubt
// );
// router.post(
//   "/recommendations/respond-clarification/:recommendationId",
//   respondToRecommendationDoubt
// );

// // Highlight routes
// router.post("/highlights", postHighlight);
// router.get("/documents/highlights/:documentId", getHighlights);

router.get("/logs/getUserLogs", get_user_activity_logs);
router.get("/logs/:processId/:stepInstanceId?", get_user_activity_log);
router.get("/getProcessActivityLogs/:processId", get_process_activity_logs);

router.get("/getNumbers", getNumbers);
router.get("/getDetails", getDetails);
router.get("/workflowAnalysis/:workflowId", getWorkflowAnalysis);

router.post("/deleteFile", delete_file);
router.post("/recoverDeletedFile", recover_from_recycle_bin);
router.post("/archiveFile", archive_file);
router.post("/unarchiveFile", unarchive_file);
export default router;
