import express from "express";
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

const router = express.Router();

router.post("/upload", file_upload);
router.post("/download", file_download);
router.post("/copyFile", file_copy);
router.post("/cutFile", file_cut);
router.post("/deleteFile", file_delete);
router.post("/createFolder", create_folder);
router.post("/downloadFolder", folder_download);
router.get("/files/:filePath(*)", file_though_url);
router.get("/getFileData", get_file_data);

export default router;
