import multer from "multer";
import path from "path";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs/promises";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      default:
        return cb(new Error("Invalid purpose specified"));
    }

    destinationDirectory = path.join(__dirname, destinationDirectory);

    try {
      await fs.access(destinationDirectory);
      cb(null, destinationDirectory);
    } catch (error) {
      console.log("error accessing dest", error);
      await fs.mkdir(destinationDirectory, { recursive: true });
      cb(null, destinationDirectory);
    }
  },
  filename: async function (req, file, cb) {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return cb(new Error("Unauthorized request"));
    }

    let customName;
    switch (req.body.purpose) {
      case "signature":
        customName = userData.username.toLowerCase();
        break;
      case "profile":
        customName = `${userData.username.toLowerCase()}_profile_pic`;
        break;
      case "dsc":
        customName = `${userData.username.toLowerCase()}_dsc`;
        break;
      default:
        return cb(new Error("Invalid purpose specified"));
    }

    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const fileName = customName + extension;
    cb(null, fileName);
  },
});

const upload_ = multer({ storage: storage });

export default upload_;
