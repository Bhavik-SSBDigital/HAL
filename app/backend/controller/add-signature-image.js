import upload from "../config/multer-config.js"; // Import the multer configuration
import path from "path";
import { verifyUser } from "../utility/verifyUser.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import User from "../models/user.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Controller function for uploading signature and image
export const upload_signature = async (req, res) => {
  try {
    const accessToken = req.headers["authorization"].substring(7);
    const userData = await verifyUser(accessToken);
    if (userData === "Unauthorized") {
      return cb(new Error("Unauthorized request"));
    }

    if (req.body.purpose === "signature") {
      await User.findByIdAndUpdate(
        { _id: userData._id },
        {
          signaturePicFileName: `${
            userData.username.toLowerCase() +
            "." +
            req.file.originalname.split(".").pop()
          }`,
        }
      );
    } else {
      await User.findByIdAndUpdate(
        { _id: userData._id },
        {
          profilePicFileName: `${
            userData.username.toLowerCase() +
            "_profile_pic" +
            "." +
            req.file.originalname.split(".").pop()
          }`,
        }
      );
    }
    // console.log("req", req);
    // Access uploaded file details via req.file
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    res.status(200).send("File uploaded.");
  } catch (error) {
    console.log(error, "error uploading file");
    return res.status(500).json({
      message: "error uploading file",
    });
  }
};

// Other controller functions for handling signatures, if needed

export default upload_signature;
