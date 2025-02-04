import express from "express";

import { sign_up, login, create_admin } from "../controller/auth-controller.js";

import {
  add_department,
  get_department,
  get_departments,
} from "../controller/department-controller.js";

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

const router = express.Router();

router.post("/signup", sign_up);
router.post("/login", login);

router.post("/createAdmin", create_admin);

router.post("/addDepartment", add_department);

// change POST to GET
router.post("/getDepartments", get_departments);

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

export default router;
