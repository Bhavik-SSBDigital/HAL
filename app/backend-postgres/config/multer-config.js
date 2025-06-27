import multer from "multer";
import path from "path";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    let destinationDirectory;
    switch (req.body.purpose) {
      case "signature":
        destinationDirectory = process.env.SIGNATURE_FOLDER_PATH;
        break;
      case "profile":
        destinationDirectory = process.env.PROFILE_PIC_FOLDER_PATH;
        break;
      case "dsc":
        destinationDirectory = process.env.DSC_FOLDER_PATH;
        break;
      case "template":
        // Fetch workflow to determine destination
        const { workflowId } = req.body;
        if (!workflowId) {
          return cb(new Error("Workflow ID is required for template uploads"));
        }
        const workflow = await prisma.workflow.findUnique({
          where: { id: workflowId },
          select: { name: true },
        });
        if (!workflow) {
          return cb(new Error("Workflow not found"));
        }
        destinationDirectory = path.join(
          process.env.STORAGE_PATH || "storage",
          workflow.name,
          "templates"
        );
        break;
      default:
        return cb(new Error("Invalid purpose specified"));
    }

    destinationDirectory = path.join(__dirname, "../", destinationDirectory); // Adjust path relative to __dirname

    try {
      await fs.access(destinationDirectory);
      cb(null, destinationDirectory);
    } catch (error) {
      console.log("Error accessing destination:", error);
      await fs.mkdir(destinationDirectory, { recursive: true });
      cb(null, destinationDirectory);
    }
  },
  filename: async function (req, file, cb) {
    const accessToken = req.headers["authorization"]?.substring(7);
    if (!accessToken) {
      return cb(new Error("Authorization token missing"));
    }
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return cb(new Error("Unauthorized request"));
    }

    let fileName;
    switch (req.body.purpose) {
      case "signature":
        fileName = `${userData.username.toLowerCase()}${path.extname(
          file.originalname
        )}`;
        break;
      case "profile":
        fileName = `${userData.username.toLowerCase()}_profile_pic${path.extname(
          file.originalname
        )}`;
        break;
      case "dsc":
        fileName = `${userData.username.toLowerCase()}_dsc${path.extname(
          file.originalname
        )}`;
        break;
      case "template":
        fileName = file.originalname; // Use original filename for templates
        break;
      default:
        return cb(new Error("Invalid purpose specified"));
    }

    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const supportedExtensions = [
      ".docx",
      ".docm",
      ".dotx",
      ".xlsx",
      ".xlsm",
      ".xltx",
      ".pptx",
      ".pptm",
      ".potx",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (supportedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file extension"), false);
    }
  },
});

export default upload;
