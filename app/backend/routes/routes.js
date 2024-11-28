import express from "express";
import {
  file_upload,
  file_download,
  create_folder,
  folder_download,
  file_copy,
  file_cut,
  file_delete,
} from "../controller/file-controller.js";
import {
  signup_POST,
  login_POST,
  get_usernames,
  create_admin,
  get_users,
  change_password,
  delete_user,
  edit_user,
  get_users_by_role_of_branch,
  get_user_profile_data,
  get_user_profile_pic,
  get_user_signature,
  get_user,
  forgotPassword_POST,
} from "../controller/user-controller.js";
import {
  getDocumentDetailsOnTheBasisOfPath,
  create_permissions,
  getDocumentDetailsForAdmin,
  getDocumentDetailsOnTheBasisOfPathForEdit,
  getDocumentChildren,
} from "../controller/file-details-controller.js";
import {
  getRootDocumentsWithAccess,
  getRootDocumentsForEdit,
} from "../controller/project-controller.js";
import {
  create_branch,
  edit_branch,
  delete_branch,
  get_all_branches,
  get_all_branches_with_departments,
  get_branch_details,
} from "../controller/branch-controller.js";
import {
  add_role,
  edit_role,
  delete_role,
  get_roles_in_branch,
  get_roles,
  get_role_names,
  get_role,
} from "../controller/role-controller.js";
import { test } from "../utility/accessFunction.js";
import {
  getWorks,
  addWork,
  add_department,
  edit_department,
  get_departments,
  get_department,
  delete_department,
  get_departments_for_initiator,
} from "../controller/department-controller.js";

import {
  add_process,
  upload_documents_in_process,
  get_process_document_name,
  get_process,
  get_process_for_user,
  publish_process,
  forward_process,
  revert_process,
  get_user_notifications_for_processes,
  remove_notification_from_user_document,
  send_process_to_clerk_for_work,
  end_process,
  branch_manager_approval,
  head_office_rejection,
  pick_process,
  get_documents_names_in_process,
  get_process_names_for_specific_user,
} from "../controller/processes-controller.js";

import { get_user_logs, get_user_log } from "../controller/log-controller.js";
import {
  add_sign_coordinates,
  get_sign_coordinates_for_specific_step,
} from "../controller/sign-handlers/sign-coordinates-handler.js";

import {
  sign_document,
  reject_document,
} from "../controller/e-sign-controller.js";

import { get_process_number } from "../controller/dashboard-controllers/process-number-analysis-controller.js";

import { get_current_pending_process_per_step } from "../controller/dashboard-controllers/pending-process-analysis-controller.js";

import { get_process_history } from "../controller/process-description-controller.js";

import { upload_signature } from "../controller/add-signature-image.js";

import {
  get_highlights_in_file,
  post_highlight_in_file,
} from "../controller/file-content-highlight-controller.js";

import {
  borrow_document,
  return_document,
  get_document_history,
  get_borrowed_document_list,
  search_document,
} from "../controller/doc-tracking-controller.js";

import multer from "multer";

// Configure a Multer instance without any specific destination or filename settings
const uploadDummy = multer();

import upload from "../config/multer-config.js";
import {
  add_comment_in_meeting_after_meeting_time,
  create_meeting,
  get_meeting_details,
  get_meetings_for_user,
  is_user_an_attendee,
} from "../controller/meeting-controller.js";
import { compare_documents } from "../controller/compare-documents.js";
// const upload = multer();

const router = express.Router();

//sign up and login
router.post("/signup", signup_POST);
router.post("/login", login_POST);
router.post("/changePassword", change_password);
router.post("/getUserSignature", get_user_signature);
router.post("/getUserProfilePic", get_user_profile_pic);

// upload & download
router.post("/upload", file_upload);
router.post("/download", file_download);
router.post("/copyFile", file_copy);
router.post("/cutFile", file_cut);
router.post("/deleteFile", file_delete);

//admin
router.post("/createAdmin", create_admin);
router.post("/getAllDocuments", getDocumentDetailsForAdmin);
router.post("/test", test);
router.post("/getDocumentChildren", getDocumentChildren);
//creating folder
router.post("/createFolder", create_folder);
router.post("/downloadFolder", folder_download);

// accessing documents
router.post("/accessFolder", getDocumentDetailsOnTheBasisOfPath);
router.post("/getProjects", getRootDocumentsWithAccess);

// gettting usernames to display
router.post("/getUsernames", get_usernames);
router.post("/getUsers", get_users);
router.post("/deleteUser/:userId", delete_user);
router.post("/getUsersByRoleInBranch", get_users_by_role_of_branch);
router.post("/getUser/:userId", get_user);

// edit user
router.post("/editUser/:userId", edit_user);

// create permissions for documents
router.post("/createPermissions", create_permissions);

// branch controllers
router.post("/createBranch", create_branch);
router.post("/editBranch/:branchId", edit_branch);
router.post("/deleteBranch/:branchId", delete_branch);
router.post("/getAllBranches", get_all_branches);
router.post("/getBranchesWithDepartments", get_all_branches_with_departments);
router.post("/getBranch/:branchId", get_branch_details);

router.post("/addWork", addWork);
router.post("/getWorks", getWorks);
router.post("/addDepartment", add_department);
router.post("/getDepartment/:id", get_department);
router.post("/editDepartment/:id", edit_department);
router.post("/deleteDepartment/:id", delete_department);
router.post("/getDepartments", get_departments);
router.post("/getDepartmentForInititors", get_departments_for_initiator);
// role controllers
router.post("/addRole", add_role);
router.post("/editRole/:roleId", edit_role);
router.post("/deleteRole/:roleId", delete_role);
router.post("/getRolesInBranch/:branchId", get_roles_in_branch);
router.post("/getRoleNames", get_role_names);
router.post("/getRoles", get_roles);
router.post("/getRole/:roleId", get_role);

router.post(
  "/getDocumentDetailsOnTheBasisOfPathForEdit",
  getDocumentDetailsOnTheBasisOfPathForEdit
);
router.post("/getRootDocumentsForEdit", getRootDocumentsForEdit);

router.post("/getProcessDocumentName", get_process_document_name);

router.post("/addProcess", add_process);
router.post("/uploadDocumentsInProcess", upload_documents_in_process);
router.post("/getProcess/:id", get_process);
router.post("/getProcessesForUser", get_process_for_user);
router.post("/publishProcess", publish_process);
router.post("/forwardProcess", forward_process);
router.post("/pickProcess/:processId", pick_process);
router.post("/revertProcess", revert_process);
router.post("/approveProcess/:processId", branch_manager_approval);
router.post("/rejectFromHeadOffice/:processId", head_office_rejection);

router.post("/getUserLogs", get_user_logs);

router.post("/signDocument", sign_document);
router.post("/rejectDocument", reject_document);

router.post("/getUserLog/:id", get_user_log);

router.post("/getProcessNumber", get_process_number);

router.post(
  "/getPendingProcessCountPerStepInDepartment",
  get_current_pending_process_per_step
);

router.post("/getProcessHistory", get_process_history);

router.post("/forgetPassword", forgotPassword_POST);

router.post(
  "/uploadSignature",
  // uploadDummy.any(),
  // set_purpose,
  upload.single("file"),
  upload_signature
);

router.post("/getUserProfileData", get_user_profile_data);

router.post(
  "/getUserProcessNotifications",
  get_user_notifications_for_processes
);

router.post(
  "/removeProcessNotification/:id",
  remove_notification_from_user_document
);

router.post("/sendToClerk/:id", send_process_to_clerk_for_work);

router.post("/endProcess/:id", end_process);

router.post("/getDocNamesInProcess", get_documents_names_in_process);

router.post("/postHighlightInFile", post_highlight_in_file);

router.get("/getHighlightsInFile/:id", get_highlights_in_file);

router.post("/borrowDocument", borrow_document);

router.post("/returnDocument", return_document);

router.get("/getDocumentHistory/:documentId", get_document_history);

router.get("/getBorrowedDocuments", get_borrowed_document_list);

router.post("/searchDocument", search_document);

router.get("/getProcessNames", get_process_names_for_specific_user);

router.post("/createMeet", create_meeting);

router.get("/getMeetingsForUser", get_meetings_for_user);

router.get("/isUserAnAttendee/:meetingId", is_user_an_attendee);

router.get("/getMeetingDetails/:meetingId", get_meeting_details);

router.post("/addCommentInMeeting", add_comment_in_meeting_after_meeting_time);

router.post("/compareDocuments", compare_documents);

router.post("/storeSignCoordinates", add_sign_coordinates);

router.post(
  "/getSignCoordinatesForCurrentStep",
  get_sign_coordinates_for_specific_step
);

export default router;
