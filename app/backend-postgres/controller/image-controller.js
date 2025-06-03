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
    let fileName;
    let updateData;

    switch (req.body.purpose) {
      case "signature":
        fileName = `${userData.username.toLowerCase()}.${fileExtension}`;
        updateData = { signaturePicFileName: fileName };
        break;
      case "profile":
        fileName = `${userData.username.toLowerCase()}_profile_pic.${fileExtension}`;
        updateData = { profilePicFileName: fileName };
        break;
      case "dsc":
        fileName = `${userData.username.toLowerCase()}_dsc.${fileExtension}`;
        updateData = { dscFileName: fileName };
        break;
      default:
        return res.status(400).json({ message: "Invalid purpose specified" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userData.id },
      data: updateData,
    });

    res.status(200).json({ message: "File uploaded successfully." });
  } catch (error) {
    console.log("Error uploading file", error);
    return res.status(500).json({ message: "Error uploading file" });
  }
};
