import upload from "../config/multer-config.js"; // Import the multer configuration
import path from "path";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const upload_signature = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"]?.substring(7);
    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return res.status(401).json({ message: "Unauthorized request" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const fileExtension = req.file.originalname.split(".").pop();
    const fileName =
      req.body.purpose === "signature"
        ? `${userData.username.toLowerCase()}.${fileExtension}`
        : `${userData.username.toLowerCase()}_profile_pic.${fileExtension}`;

    const updatedUser = await prisma.user.update({
      where: { id: userData.id },
      data:
        req.body.purpose === "signature"
          ? { signaturePicFileName: fileName }
          : { profilePicFileName: fileName },
    });

    res
      .status(200)
      .json({ message: "File uploaded successfully.", user: updatedUser });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ message: "Error uploading file" });
  }
};
