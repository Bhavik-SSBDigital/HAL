import express from "express";
import multer from "multer";
import path from "path";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const STORAGE_PATH = process.env.STORAGE_PATH;
const router = express.Router();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Multer storage
// Modify your storage configuration to not rely on req.body directly
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    // Get purpose from file.fieldname (since we're using fields)

    console.log("fil", file.fieldname);
    console.log("req.body", req.body);
    const purpose =
      file.fieldname === "file" ? req.body.purpose : file.fieldname;

    console.log("purpose", purpose);

    let destinationDirectory;
    switch (purpose) {
      case "signature":
        destinationDirectory =
          process.env.SIGNATURE_FOLDER_PATH || "uploads/signatures";
        break;
      case "profile":
        destinationDirectory =
          process.env.PROFILE_PIC_FOLDER_PATH || "uploads/profiles";
        break;
      case "dsc":
        destinationDirectory = process.env.DSC_FOLDER_PATH || "uploads/dsc";
        break;
      case "template":
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
          process.env.STORAGE_PATH,
          workflow.name,
          "templates"
        );
        break;
      default:
        return cb(new Error("Invalid purpose specified"));
    }

    destinationDirectory = path.join(__dirname, destinationDirectory);

    try {
      await fs.mkdir(destinationDirectory, { recursive: true });
      cb(null, destinationDirectory);
    } catch (error) {
      console.error("Error creating destination directory:", error);
      cb(error);
    }
  },
  filename: async function (req, file, cb) {
    // Similar approach for filename
    const purpose =
      file.fieldname === "file" ? req.body.purpose : file.fieldname;

    const accessToken = req.headers["authorization"]?.substring(7);
    if (!accessToken) {
      return cb(new Error("Authorization token missing"));
    }
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return cb(new Error("Unauthorized request"));
    }

    let fileName;
    switch (purpose) {
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
        fileName = file.originalname;
        break;
      default:
        return cb(new Error("Invalid purpose specified"));
    }

    cb(null, fileName);
  },
});

// Initialize Multer with field parsing
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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
      ".png",
      ".jpeg",
      ".jpg",
      ".pfx",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    console.log("ext", ext);
    if (supportedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file extension"), false);
    }
  },
});

// Middleware to parse form fields before file upload

export default upload;
