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
    let destinationDirectory =
      req.body.purpose === "signature"
        ? process.env.SIGNATURE_FOLDER_PATH
        : process.env.PROFILE_PIC_FOLDER_PATH;

    destinationDirectory = path.join(__dirname, destinationDirectory);

    try {
      let stat = await fs.access(destinationDirectory);
      cb(null, destinationDirectory);
    } catch (error) {
      console.log("error accessing dest", error);
      await fs.mkdir(destinationDirectory, { recursive: true });
      cb(null, destinationDirectory); // Define the directory where files will be stored
    }
  },
  filename: async function (req, file, cb) {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return cb(new Error("Unauthorized request"));
    }
    // Access custom name from the request and use it in the filename
    const customName =
      req.body.purpose === "signature"
        ? userData.username.toLowerCase()
        : `${userData.username.toLowerCase() + "_profile_pic"}`; // Provide a default name if customName is not present
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const fileName = customName + extension;
    cb(null, fileName);
  },
});

const upload_ = multer({ storage: storage });

export default upload_;
